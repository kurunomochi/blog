#!/usr/bin/env python3
"""Configure this blog's OAuth clients locally; never prints or uploads secrets."""
import argparse
import getpass
import json
import os
from pathlib import Path
import signal
import subprocess
import tempfile
import time
import urllib.request


def required(prompt, secret=False):
    value = (getpass.getpass(prompt) if secret else input(prompt)).strip()
    if not value:
        raise ValueError('Client ID 和 Client Secret 不能为空')
    return value


def restart(root):
    pid = int(subprocess.check_output(['systemctl', 'show', 'blog.service', '-p', 'MainPID', '--value'], universal_newlines=True).strip())
    policy = subprocess.check_output(['systemctl', 'show', 'blog.service', '-p', 'Restart', '--value'], universal_newlines=True).strip()
    if pid <= 1 or policy != 'always' or Path('/proc', str(pid)).stat().st_uid != os.getuid():
        raise RuntimeError('无法安全重启 blog.service，请手动重启服务')
    executable = os.readlink('/proc/' + str(pid) + '/exe')
    if executable.endswith(' (deleted)'):
        executable = executable[:-10]
    if Path(executable).resolve() != (root / 'target/release/blog').resolve():
        raise RuntimeError('运行中的服务路径不匹配，未重启')
    os.kill(pid, signal.SIGTERM)
    for _ in range(30):
        time.sleep(1)
        try:
            with urllib.request.urlopen('http://127.0.0.1:3000/api/auth/providers', timeout=2) as response:
                providers = json.load(response)
            if providers.get('github') and providers.get('google') and providers.get('password') is False:
                print('GitHub / Google 登录已启用，密码登录已关闭。请在浏览器完成一次授权验证。')
                return
        except (OSError, ValueError):
            pass
    raise RuntimeError('服务尚未通过登录配置检查，请检查 blog.service；配置备份仍保留')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--restart', action='store_true', help='配置后安全重启当前用户的 blog.service')
    args = parser.parse_args()
    root = Path(__file__).resolve().parent.parent
    directory = root / 'data'
    directory.mkdir(mode=0o700, exist_ok=True)
    target = directory / 'auth-providers.json'
    print('GitHub 回调：https://nenumochi.top/api/auth/github/callback')
    print('Google 回调：https://nenumochi.top/api/auth/google/callback')
    print('仅允许 GitHub kurunomochi（247356419）和 Google jiezi124168@gmail.com。')
    print('Secret 输入时不会显示；保存后将停用密码登录。')
    config = {'origin': 'https://nenumochi.top', 'allow_password_login': False,
              'github': {'client_id': required('GitHub Client ID: '), 'client_secret': required('GitHub Client Secret: ', True), 'allowed_user_id': 247356419},
              'google': {'client_id': required('Google Client ID: '), 'client_secret': required('Google Client Secret: ', True), 'allowed_email': 'jiezi124168@gmail.com'}}
    # Refuse symlinks and keep every copy outside the public web root.
    if target.is_symlink():
        raise RuntimeError('配置路径不能是符号链接')
    if target.exists():
        fd, backup = tempfile.mkstemp(prefix='auth-providers-backup-', suffix='.json', dir=directory)
        with os.fdopen(fd, 'wb') as handle:
            handle.write(target.read_bytes())
        print('原配置备份：' + backup)
    fd, temporary = tempfile.mkstemp(prefix='.auth-providers-', dir=directory)
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as handle:
            json.dump(config, handle, indent=2)
            handle.write('\n')
        os.replace(temporary, target)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)
    print('已保存私有配置：' + str(target))
    if args.restart:
        restart(root)
    else:
        print('重启博客服务后生效。')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, RuntimeError, OSError, KeyboardInterrupt) as error:
        raise SystemExit(str(error) or '已取消，未完成配置')
