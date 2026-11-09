export const phases = [
  ['重新上手', '01—03', '工具链、类型与表达式'],
  ['重建核心模型', '04—09', '所有权、借用与数据建模'],
  ['写出地道 Rust', '10—17', '集合、抽象、生命周期与测试'],
  ['掌握进阶机制', '18—24', '智能指针、并发、异步与 unsafe'],
  ['走向工程实践', '25—28', 'API、Cargo、I/O 与性能'],
  ['完成一次交付', '29—30', '综合项目与后续学习'],
];
export const lessons = [];
function add(id, phase, title, subtitle, sections, code, output, pitfall, task, hint, answer, quiz, source) {
  lessons.push({ id, phase, title, subtitle, sections, code: code.trim(), output, pitfall, task, hint, answer, quiz, source });
}
add('01',0,'工具链与复习方法','先恢复反馈循环，再恢复语法记忆。',[
 ['三个工具，各司其职','rustup 管理工具链和组件；rustc 编译 Rust 源码；Cargo 组织包、依赖、构建和测试。先运行 rustc --version、cargo --version、rustup show，确认终端实际使用的版本。编辑器建议启用 rust-analyzer；补全只是辅助，编译器诊断才是修改的依据。'],
 ['建立最小反馈循环','cargo new 创建二进制包，cargo new --lib 创建库包。修改代码后先 cargo check，再 cargo test，最后 cargo run。check 通常省去生成可执行文件的成本。--release 使用 release profile；调试构建速度和运行速度不是同一件事。本课程示例使用 edition 2024，在本机 Rust 1.97.1 验证，不把它宣称为最新版本。'],
 ['每章怎么学','先不运行代码，写下你预测的类型、所有权归属和输出；再运行并比较；然后故意改坏一处，阅读第一条诊断，最后不看答案重写。每天留出 10 分钟从空文件复现昨天的重点。学过不等于会用，完成标记应以能解释、能修改、能测试为准。'],
 ['读懂第一条错误','错误通常包括错误码、主错误位置、相关借用或移动发生的位置、帮助建议。先修最早的根因，再重新编译，避免同时处理连锁错误。cargo doc --open 阅读项目文档；rustup doc --book 阅读已安装的离线教材。']
],`fn main() {
    let topic = "Rust";
    println!("重新开始：{topic}");
    assert_eq!(2 + 3, 5);
}`, '重新开始：Rust',
 '不要把 edition 当作编译器版本。edition 是逐包选择的语言兼容模式；同一个编译器可以编译多个 edition 的包。',
 '运行 examples/ch01.rs，再把断言右侧改为 6，观察编译成功与运行失败的区别。恢复代码后执行 cargo check。',
 '工作目录进入 workbook；命令为 cargo run --offline --example ch01。assert_eq! 检查的是运行时值。',
 '断言写成 6 时仍能通过类型检查，但运行时 panic。恢复为 5 后程序正常退出；这说明类型正确并不代表业务逻辑正确。',
 [['cargo check 主要检查什么？',['类型与编译正确性','所有业务行为','只检查格式'],0,'check 不能证明业务逻辑正确，也不执行单元测试。'],['edition = "2024" 表示？',['必须使用名为 2024 的编译器','使用 2024 兼容规则','每年自动升级'],1,'edition 是 Cargo.toml 的包级设置，需要支持该 edition 的编译器。']],
 'https://doc.rust-lang.org/cargo/guide/');
add('02',0,'变量、类型与内存布局','区分值、绑定、可变性和类型推断。',[
 ['不可变绑定与遮蔽','let 默认绑定不可变；mut 允许给同一绑定重新赋值，但类型保持不变。shadowing 用新的 let 创建同名新绑定，可以改变类型；它不是原地改变旧值的类型。const 必须写类型，表达式须能在常量上下文求值；static 表示具有静态存储期的项，修改可变全局状态需要更严格的设计。'],
 ['数值不是无条件互换','默认整数常常推断为 i32，默认浮点常常为 f64，但上下文能改变推断。usize 常用于索引，其宽度取决于目标平台。as 转换可能截断或改变数值解释；对外部输入优先使用 TryFrom。整数溢出的处理受构建配置影响，需要明确语义时使用 checked_*、saturating_* 或 wrapping_*。'],
 ['复合值与 Unicode','元组允许不同元素类型；数组 [T; N] 的长度属于类型；切片 [T] 是动态大小类型，通常通过 &[T] 使用。char 是 Unicode 标量值，占 4 字节，不一定等于用户看到的一个完整字符。布尔条件不能用整数代替。浮点不适合用 == 表达一般近似数值相等，货币等精确值应另行设计。'],
 ['栈和堆只是实现视角','不要记成“简单类型在栈上，复杂类型在堆上”。String 的句柄和值的缓冲区是不同部分，数组也能放进 Box；编译器还可能优化存储。更可靠的问题是：谁拥有资源、值是否 Sized、何时释放、是否发生分配。']
],`fn main() {
    let raw = "42";
    let raw: u16 = raw.parse().expect("固定演示输入");
    let mut score = raw;
    score += 1;
    let pair: (u16, bool) = (score, true);
    let xs = [2, 4, 6];
    assert!(u8::try_from(300_u16).is_err());
    println!("{} {} {}", pair.0, pair.1, xs.len());
    println!("{:?}", 255_u8.checked_add(1));
}`, '43 true 3\nNone',
 'String::len() 是字节数，chars().count() 是 Unicode 标量值个数，二者都不保证是用户感知字符数。',
 '实现 workbook 的 ex01：接收 u16，通过 TryFrom 返回 Option<u8>；255 成功，256 失败。',
 'Result::ok() 可以把成功值转为 Some，把错误转为 None。',
 'u8::try_from(value).ok()。这里把具体转换错误丢弃是刻意的 API 决策；若调用者需要原因，应返回 Result。',
 [['let x = "3"; let x = x.len(); 是？',['修改字符串内部类型','创建新的同名绑定','非法语法'],1,'遮蔽允许新绑定拥有不同类型。'],['需要明确检测整数加法溢出，选择？',['checked_add','假设 release 一定 panic','无条件 as'],0,'checked_add 用 Option 显式表达无法表示的结果。']],
 'https://doc.rust-lang.org/book/ch03-02-data-types.html');
add('03',0,'表达式、函数与控制流','看清末尾分号、返回值和模式。',[
 ['Rust 以表达式组织计算','表达式产生值，语句用于执行动作。代码块的最后一个无分号表达式成为块的值；加上分号通常让结果变成 ()。if 的各分支需要兼容的类型。return 可以提前返回，但函数末尾通常使用尾表达式。函数参数必须声明类型，返回类型默认为 ()。'],
 ['循环也可以产生值','loop 可以通过 break value 返回结果；while 适合条件循环；for 基于 IntoIterator。0..n 不包含 n，0..=n 包含 n。嵌套循环可使用标签控制具体哪一层。遍历容器时优先使用迭代器，而不是反复索引，这样能减少边界和借用问题。'],
 ['模式不是普通赋值','let、函数参数、match、if let 和 while let 都可能使用模式。解构元组或结构体时，绑定模式决定是移动字段还是借用字段。let-else 适合先处理失败路径，它的 else 必须发散，例如 return、break 或 panic。match 守卫可以增加条件，但不能代替穷尽性检查。']
],`fn classify(n: i32) -> &'static str {
    match n {
        n if n < 0 => "negative",
        0 => "zero",
        1..=9 => "small",
        _ => "large",
    }
}
fn main() {
    let total: i32 = (1..=4).sum();
    let label = if total > 5 { "high" } else { "low" };
    let mut n = 0;
    let found = loop {
        n += 1;
        if n * n > 20 { break n; }
    };
    println!("{total} {label} {found} {}", classify(-1));
}`, '10 high 5 negative',
 'if 条件要求 bool；一个分支返回 String、另一个返回整数不能自动变成“任意类型”。使用 enum 表达不同形态。',
 '写一个 classify_score：0..=59 返回 fail，60..=100 返回 pass，其余返回 invalid。测试 -1、0、59、60、100、101。',
 '先划分合法范围，match 的最后一个分支覆盖越界值。',
 'match score { 0..=59 => "fail", 60..=100 => "pass", _ => "invalid" }。边界测试比只测试 75 更有价值。',
 [['函数末尾 x + 1; 返回什么？',['x + 1 的值','通常是 ()','自动返回 x'],1,'分号把尾表达式变成语句，若声明返回整数就出现类型不匹配。'],['let Some(x) = value else { ... }; 的 else 应？',['正常继续','必须发散','必须返回 bool'],1,'无法绑定 x 时不能继续进入使用 x 的后续作用域。']],
 'https://doc.rust-lang.org/book/ch03-05-control-flow.html');
add('04',1,'所有权、Move、Copy 与 Drop','能画出每个值在每一步属于谁。',[
 ['所有权解决资源释放','一个拥有资源的值在某个时刻由一个所有者负责；所有者结束有效作用域时执行清理。对于 String，清理包括释放缓冲区。移动把责任交给另一个绑定，不代表深复制堆数据。函数按值接收参数、返回值、结构体字段赋值都可能发生移动。'],
 ['Copy 是类型能力','i32 等 Copy 类型赋值后原绑定仍可使用；String 不实现 Copy。Copy 隐含要求 Clone，且实现 Drop 的类型不能同时实现 Copy。Clone 是显式复制行为，其成本由类型决定；Rc::clone 只增加引用计数，而 String::clone 通常复制缓冲区。'],
 ['部分移动与资源管理','从结构体中移动一个非 Copy 字段，可能使整个结构体不再可用，但其他未移动字段仍可能可用；含 Drop 的类型有额外限制。std::mem::take 用 Default 替换原值并取走旧值；Option::take 特别适合从借用的结构体中取出可选资源。不要为了消除报错到处 clone，先判断函数真的需要拥有数据吗。']
],`fn consume(s: String) -> usize { s.len() }
fn main() {
    let original = String::from("rust");
    let moved = original;
    // println!("{original}"); // E0382：已被移动
    let backup = moved.clone();
    let len = consume(moved);
    let mut slot = Some(backup);
    let taken = slot.take().unwrap();
    assert!(slot.is_none());
    let x = 7;
    let y = x;
    println!("{taken} {len} {}", x + y);
}`, 'rust 4 14',
 'move 不是“强制把值放到堆上”；它描述所有权转移。Drop 也不是垃圾回收器的可达性扫描。',
 '不使用 clone，写一个函数 append_suffix，接收 String，添加 ! 后返回它；主函数继续使用返回的新所有者。',
 '参数使用 mut text: String，返回值类型也是 String。',
 'fn append_suffix(mut text: String) -> String { text.push(\'!\'); text }。调用 let text = append_suffix(text); 用遮蔽接住所有权。',
 [['String 赋给另一个变量默认？',['深复制','移动','增加引用计数'],1,'String 的拥有权转移，原绑定不再可用。'],['想从 &mut Option<String> 取走内容，可用？',['take()','直接解引用并移动','强制转为 static'],0,'take 留下 None，保持原位置是一个有效值。']],
 'https://doc.rust-lang.org/book/ch04-01-what-is-ownership.html');
add('05',1,'借用与可变性','借用是有期限的访问权限。',[
 ['共享访问与独占访问','&T 借用而不转移所有权；&mut T 表示独占的可变访问。对同一位置，在重叠的有效借用期间，不能同时拥有活跃的共享访问和独占访问。可变绑定 let mut x 与可变引用 &mut T 不是一回事：前者允许改绑定，后者允许经由引用修改被指向的值。'],
 ['借用结束不一定等到右大括号','非词法生命周期分析会根据后续使用缩短借用有效期。读取一个引用的最后一次使用后，往往可以再可变借用。反之，只要后面还使用该引用，向 Vec 追加元素就可能冲突，因为追加可能重新分配缓冲区。应调整操作顺序、缩小作用域，或取出 Copy 值。'],
 ['拆分数据而不是绕过检查','编译器能识别结构体不同字段的互不重叠借用，但对运行时下标通常不能证明两个位置不同。切片的 split_at_mut 把一块可变借用安全地拆为两个不相交区间。内部可变性允许经由共享引用修改部分数据，但由 Cell、RefCell、Mutex 等类型维护额外规则。']
],`fn normalize(text: &mut String) { *text = text.trim().to_owned(); }
fn main() {
    let mut title = String::from("  Rust  ");
    let view = &title;
    println!("{}", view.trim()); // view 最后一次使用
    normalize(&mut title);
    let mut values = [1, 2, 3, 4];
    let (left, right) = values.split_at_mut(2);
    left[0] += 10;
    right[0] += 20;
    println!("{title} {values:?}");
}`, 'Rust\nRust [11, 2, 23, 4]',
 '“不可变引用意味着任何东西都不可能变化”过于绝对：UnsafeCell 支撑的内部可变性是受控例外；普通 &mut 的独占约束仍必须遵守。',
 '实现 ex02：输入 &mut [i32]，把所有负数改成 0，保持长度不变且不分配新 Vec。',
 '使用 iter_mut()，得到的每个元素类型是 &mut i32；通过 *item 修改。',
 'for item in values.iter_mut() { if *item < 0 { *item = 0; } }。也可以 *item = (*item).max(0)。',
 [['Vec 的元素引用之后还要使用，这时 push 可能失败，因为？',['push 总是非法','可能重新分配，使引用失效','引用自动复制 Vec'],1,'共享引用与可能改变存储的可变借用发生冲突。'],['如何安全借用切片的两个不相交区域？',['split_at_mut','随意构造两个裸指针','把生命周期写大'],0,'API 在检查分割点后封装了不相交访问的证明。']],
 'https://doc.rust-lang.org/book/ch04-02-references-and-borrowing.html');
add('06',1,'String、str、切片与 Unicode','处理文本时，先确定你操作的是哪种单位。',[
 ['拥有文本与借用文本','String 拥有可增长的 UTF-8 缓冲区；str 是动态大小的 UTF-8 文本，通常通过 &str 使用。只读参数优先 &str，因为它能接收字符串字面量及 String 的借用。需要返回新生成的内容通常返回 String；返回输入的一段则可以返回与输入关联的 &str。'],
 ['字节、标量值和字素簇','len 返回字节数；chars 遍历 Unicode 标量值；用户感知字符可能由多个标量值组合，例如带组合音标的字母或 emoji 序列。字符串不能用整数下标直接索引。&s[a..b] 的边界必须落在 UTF-8 字符边界，否则 panic；s.get(a..b) 会返回 Option。'],
 ['选择不会破坏边界的工具','split_whitespace 处理 Unicode 空白；lines 逐行遍历；char_indices 同时给出字节偏移和标量值。trim 返回借用片段，不分配新字符串；to_owned 或 to_string 产生拥有的文本。ASCII 协议字段可以按字节处理，但用户文本需要明确编码与正规化策略。路径不要默认可以无损转成 UTF-8 String。']
],`fn first_word(text: &str) -> Option<&str> {
    text.split_whitespace().next()
}
fn main() {
    let text = "你好 Rust";
    println!("{} {}", text.len(), text.chars().count());
    println!("{}", first_word(text).unwrap());
    assert!(text.get(0..1).is_none());
    assert_eq!(text.get(0..3), Some("你"));
    let initials: String = text.chars().take(2).collect();
    println!("{initials}");
}`, '11 7\n你好\n你好',
 'chars().rev() 反转的是 Unicode 标量值，不是通用的视觉字符反转算法。课程相关练习明确按标量值计算。',
 '实现 ex03：返回首个非空白单词的借用；空串或全部空白返回 None。测试中文和换行。',
 'split_whitespace().next() 已经覆盖连续空白和空输入。',
 'fn first_word(text: &str) -> Option<&str> { text.split_whitespace().next() }。无需 clone，也不应返回对临时 String 的引用。',
 [['"你好".len() 是？',['2','6','取决于系统默认编码'],1,'Rust 的 str 使用 UTF-8，这两个汉字各占 3 字节。'],['适合只读文本的通用参数是？',['&String','&str','String 总是更好'],1,'&str 不要求调用者必须拥有 String。']],
 'https://doc.rust-lang.org/book/ch08-02-strings.html');
add('07',1,'结构体、方法与不变量','用类型封装规则，而不只是装数据。',[
 ['结构体代表一组同时存在的信息','命名字段适合领域模型；元组结构体适合简短包装；单元结构体适合无状态标记。字段默认私有。构造时必须提供全部字段，或使用更新语法 ..other；更新语法也可能移动非 Copy 字段。derive 可以为满足约束的字段自动生成 Debug、Clone、PartialEq 等实现。'],
 ['方法接收者表达权限','&self 读取对象；&mut self 修改对象；self 消耗对象。关联函数不接收 self，常用 new、parse 等命名。构造函数不是语言特殊机制，new 只是惯例。不要默认每个结构体都需要 getter/setter，公开哪些操作应由领域规则决定。'],
 ['构造时建立有效性','把字段设为私有，通过返回 Result 的构造函数拒绝无效输入。例如非空标题、正数 ID、受限百分比。之后方法可以依赖这些不变量。newtype 用 struct UserId(u64) 区分语义相近但不可互换的数据，比 type UserId = u64 更有约束力。']
],`#[derive(Debug)]
struct Lesson { title: String, done: bool }
impl Lesson {
    fn new(title: &str) -> Result<Self, &'static str> {
        if title.trim().is_empty() { return Err("empty title"); }
        Ok(Self { title: title.trim().to_owned(), done: false })
    }
    fn complete(&mut self) { self.done = true; }
    fn label(&self) -> &str { &self.title }
}
fn main() {
    let mut lesson = Lesson::new("所有权").unwrap();
    lesson.complete();
    println!("{} {}", lesson.label(), lesson.done);
    assert!(Lesson::new("  ").is_err());
}`, '所有权 true',
 'type UserId = u64 只是别名，不能阻止把订单 ID 当用户 ID 传入。想形成独立类型要用 newtype。',
 '给 Lesson 增加 reset(&mut self)，并说明为何 label 返回 &str 而不是 String。',
 'reset 只改布尔字段；label 的返回借用由 &self 的生命周期决定。',
 'fn reset(&mut self) { self.done = false; }。label 不生成新文本，返回 &str 可以避免不必要的分配，并约束引用不能比 Lesson 活得更久。',
 [['fn finish(self) 表达什么？',['只读借用','消耗接收者','全局函数'],1,'方法按值接收对象，调用之后原绑定通常被移动。'],['希望 UserId 与 OrderId 不可混用，使用？',['type 别名','两个 newtype','变量名区分即可'],1,'编译器可检查不同结构体类型，变量名不能提供类型隔离。']],
 'https://doc.rust-lang.org/book/ch05-03-method-syntax.html');
add('08',1,'枚举、Option 与模式匹配','让不合法状态尽量无法表示。',[
 ['枚举表达互斥状态','struct 的字段同时存在；enum 一次只能是一个变体，每个变体可以携带不同数据。与一组布尔开关相比，enum 能减少无意义组合。例如 Download::Pending、Running { bytes }、Done { path }、Failed { reason }，每个状态只携带它需要的数据。'],
 ['Option 不是特殊的空指针','Option<T> 通过 Some(T) 与 None 显式表达有无值。用 match 处理全部分支，单一成功路径可以 if let，失败提前返回可以 let-else。map 转换里面的值；and_then 用于返回 Option 的转换并避免嵌套；ok_or_else 可以把缺失转为惰性构造的错误。'],
 ['绑定会移动还是借用','match value 可能移动非 Copy 字段；match &value 通常让绑定得到字段借用。as_ref 将 &Option<T> 转换为 Option<&T>，as_deref 进一步应用 Deref，例如 Option<String> 变成 Option<&str>。matches! 适合只判断形状，不取出数据。']
],`enum Job { Queued, Running(u32), Done(String) }
fn describe(job: &Job) -> String {
    match job {
        Job::Queued => "waiting".to_owned(),
        Job::Running(percent) => format!("{percent}%"),
        Job::Done(path) => format!("saved: {path}"),
    }
}
fn main() {
    for job in [Job::Queued, Job::Running(50), Job::Done("notes.txt".into())] {
        println!("{}", describe(&job));
    }
    let title = Some(String::from("Rust"));
    assert_eq!(title.as_deref(), Some("Rust"));
}`, 'waiting\n50%\nsaved: notes.txt',
 'unwrap 是对 Some/Ok 的假设，错误时会 panic。可以证明的不变量与不可信用户输入应分开处理。',
 '设计一个连接状态 enum：Disconnected、Connecting、Connected { address }。写只读方法返回说明文本。',
 '没有必要为 Disconnected 存储一个无意义的空地址。',
 'enum Connection { Disconnected, Connecting, Connected { address: String } }。说明函数接收 &Connection，通过 match 返回 String，Connected 分支才访问 address。',
 [['Option<String>::as_deref() 返回？',['Option<&str>','String','&Option<String>'],0,'先借用内部值，再经 Deref 获得 str 的引用。'],['把 Result 转换函数接到 Option，通常先要？',['明确处理错误或改变返回类型','直接 unwrap 所有结果','用 unsafe'],0,'Option 和 Result 表达不同失败信息，应在 API 层明确转换策略。']],
 'https://doc.rust-lang.org/book/ch06-00-enums.html');
add('09',1,'Result、错误传播与错误类型','错误是一条正常的数据通路。',[
 ['何时 Result，何时 panic','可预期失败，如文件不存在、用户输入格式错误，应进入 Result<T, E>。panic 适合程序无法继续满足内部假设的情况，不应替代普通输入验证。库代码应让调用者决定恢复、重试或退出；可执行程序可以在最外层输出错误并选择退出码。'],
 ['问号传播的是控制流','expr? 对 Ok 取值，对 Err 从当前函数提前返回，并在适用处通过 From 转换错误；Option 函数中的 ? 对 None 提前返回。不能无条件在 Result 与 Option 间混用。map_err 改变错误类型，with-context 类方法通常来自第三方库，不属于所有 Result 的内建方法。'],
 ['保留可诊断信息','公共库通常需要可匹配的错误 enum；应用边界可以使用 Box<dyn Error>，或者成熟的应用错误库。实现 Display 面向人类，Debug 面向调试，Error::source 保留底层原因。不要简单把所有错误变成“失败”，应包含操作、输入位置、文件路径等上下文，但避免把凭据写入日志。']
],`use std::num::ParseIntError;
fn sum_csv(line: &str) -> Result<i32, ParseIntError> {
    let mut total = 0;
    for part in line.split(',') {
        total += part.trim().parse::<i32>()?;
    }
    Ok(total)
}
fn main() {
    println!("{:?}", sum_csv("2, 3, 4"));
    assert!(sum_csv("2, nope").is_err());
    // 教学范围：小整数；任意输入还需处理求和溢出。
}`, 'Ok(9)',
 '用 filter_map(Result::ok) 解析数据会悄悄丢弃错误项。只有业务明确允许忽略坏记录时才这样做。',
 '实现 ex04：把逗号分隔的非空字段全部解析成 i32，返回 Result<Vec<i32>, ParseIntError>；任一字段错误就整体失败。',
 '迭代器生成 Result<i32, _> 后，可 collect 到 Result<Vec<_>, _>。空字符串也应视为错误。',
 'line.split(\',\').map(|s| s.trim().parse::<i32>()).collect()。collect 的 Result 实现会在遇到首个 Err 时返回错误。',
 [['Result 函数里的 ? 遇到 Err 会？',['跳过当前循环','从当前函数提前返回错误','自动重试'],1,'? 是错误传播，不是异常捕获或重试。'],['严格导入记录时 filter_map(Result::ok) 的风险是？',['静默丢失坏记录','一定 panic','不能编译'],0,'数据丢弃是业务选择，不应作为掩盖解析失败的默认方案。']],
 'https://doc.rust-lang.org/book/ch09-02-recoverable-errors-with-result.html');
add('10',2,'Vec、HashMap 与集合选型','先选择访问模式，再选择容器。',[
 ['Vec 的长度与容量','Vec<T> 连续存储同类型元素，len 是已初始化元素个数，capacity 是无需重新分配时可容纳的数量。with_capacity 不会创建元素。get 返回 Option<&T>；下标越界会 panic。remove 保持剩余顺序但移动后续元素；swap_remove 更快地删除末项以外的元素，但改变顺序。'],
 ['映射、集合与排序','HashMap 提供键值查找，要求键实现 Eq + Hash，不能依赖迭代顺序。BTreeMap 按键有序，键要求 Ord；需要确定性输出时它往往更方便。HashSet 表达唯一性，BTreeSet 同时有序。VecDeque 适合两端队列，BinaryHeap 适合优先级任务。'],
 ['entry 避免重复查找','entry(key).or_insert(default) 返回值的可变引用，适合计数与聚合；or_insert_with 只在缺失时构造值。调用 entry 需要拥有键，所以可能移动 String。HashMap<String, V> 往往可用 &str 查找，无需为查找临时分配 String。']
],`use std::collections::BTreeMap;
fn main() {
    let mut counts = BTreeMap::new();
    for word in "rust borrow rust".split_whitespace() {
        *counts.entry(word).or_insert(0_u32) += 1;
    }
    println!("{counts:?}");
    let mut values = Vec::with_capacity(8);
    assert!(values.is_empty());
    values.extend([10, 20, 30]);
    assert_eq!(values.get(9), None);
    println!("{}", values.remove(1));
}`, '{"borrow": 1, "rust": 2}\n20',
 '不能用 HashMap 的一次观察到的输出顺序作为测试预期。先排序、使用 BTreeMap，或按键验证。',
 '实现 ex05：忽略大小写，按空白分词，返回 BTreeMap<String, usize> 词频。暂不去除标点，不进行 Unicode 正规化。',
 '每个单词 to_lowercase，再 entry 累加。测试 "Rust rust RUST" 和空输入。',
 'let mut result = BTreeMap::new(); for word in text.split_whitespace() { *result.entry(word.to_lowercase()).or_insert(0) += 1; } result。清楚定义分词规则比“看似智能”更重要。',
 [['Vec::with_capacity(10) 的 len 是？',['10','0','不确定'],1,'容量预留不创建元素。'],['需要稳定的按键顺序，优先选？',['HashMap','BTreeMap','随机打乱 Vec'],1,'BTreeMap 的迭代顺序由键的 Ord 决定。']],
 'https://doc.rust-lang.org/std/collections/index.html');
add('11',2,'迭代器与惰性流水线','从元素类型推导整条处理链。',[
 ['三种遍历，三种权限','对 Vec<T>，iter() 产出 &T，iter_mut() 产出 &mut T，into_iter() 按值消费容器并产出 T。对引用调用 IntoIterator 又会有对应的借用行为，因此不要只记住方法名字，要看接收者类型。for 循环本质上通过 IntoIterator 获取迭代器并不断调用 next。'],
 ['适配器与消费者','map、filter、take、skip、zip 等通常是惰性适配器，构造链不等于执行。collect、sum、fold、for_each、find 等会消费迭代器，但不一定遍历全部元素：find、any、all 可以短路。Iterator::next 返回 Option<Self::Item>，None 表示当前结束。'],
 ['引用层数要按签名判断','filter 的谓词接收 &Self::Item。若前面 iter() 的 Item 为 &i32，谓词看到的可能是 &&i32；copied 把 Copy 元素从引用转成值，cloned 显式克隆元素。collect 的目标类型决定最终结果，可以是 Vec、String、Result<Vec<_>, _> 等。'],
 ['可读性优先于链长度','适合表达数据变换时使用流水线；复杂状态更新和多条错误路径可以保留 for。避免每一步都 collect 造成中间分配；如果只求总和，直接 sum。不要为了所谓函数式风格把简单逻辑变成难以定位错误的嵌套闭包。']
],`fn main() {
    let values = vec![1, 2, 3, 4, 5];
    let selected: Vec<i32> = values.iter().copied()
        .filter(|x| x % 2 == 0).map(|x| x * x).collect();
    let total: i32 = selected.iter().sum();
    println!("{selected:?} {total}");
    assert_eq!(values.len(), 5); // 只借用了 values
    let parsed: Result<Vec<i32>, _> = ["10", "20"].into_iter()
        .map(str::parse::<i32>).collect();
    assert_eq!(parsed.unwrap(), vec![10, 20]);
}`, '[4, 16] 20',
 'map 里写副作用却不消费迭代器，副作用不会执行。需要副作用循环可使用 for 或 for_each。',
 '实现 ex06：返回输入切片中所有偶数的平方和，结果使用 i64，覆盖空切片和负数。',
 '先转为 i64 再平方；本题假设总和可放入 i64，不能先用 i32 相乘再转换。',
 'values.iter().copied().filter(|n| n % 2 == 0).map(|n| { let n = i64::from(n); n * n }).sum()。生产 API 若接受任意长度，应明确总和溢出的策略。',
 [['iter() 之后 filter 闭包的入参可能是 &&T，因为？',['filter 再借用 Item','Rust 随机加引用','iter 会复制容器'],0,'filter 接收 &Self::Item，而 iter 的 Item 本身已是引用。'],['map 已构造但没人消费，通常？',['立即执行','延迟执行','自动启动线程'],1,'惰性适配器需要消费者拉取元素。']],
 'https://doc.rust-lang.org/std/iter/trait.Iterator.html');
add('12',2,'闭包与 Fn 家族','区分捕获方式和调用能力。',[
 ['闭包可以捕获环境','函数项不能隐式捕获局部变量，闭包可以。编译器按闭包使用方式推断捕获：共享借用、可变借用、按值移动。move 强制捕获时按值取得环境，但被捕获的是引用时，移动的是引用本身，不会复制它指向的对象。'],
 ['三个 trait 是能力集合','FnOnce 的 call_once 消费闭包，可以调用至少一次；FnMut 可通过可变借用重复调用；Fn 可通过共享借用重复调用。实现 Fn 的闭包也实现 FnMut 和 FnOnce。闭包是否把捕获值移出决定它能否重复调用，而不仅仅看有没有 move 关键字。'],
 ['API 约束写到刚好够用','只调用一次的回调通常可接受 FnOnce；需要更新内部计数并反复调用则接受 FnMut；无需修改捕获状态的多次调用可以接受 Fn。返回闭包时常用 impl Fn(...) -> ...，它隐藏具体的匿名类型。存放不同闭包可能需要 Box<dyn Fn(...)>。']
],`fn once<F: FnOnce() -> String>(f: F) -> String { f() }
fn main() {
    let label = String::from("Rust");
    let read = move || label.len();
    println!("{} {}", read(), read()); // move 闭包仍可重复调用
    let mut count = 0;
    {
        let mut bump = || { count += 1; count };
        assert_eq!(bump(), 1);
        assert_eq!(bump(), 2);
    }
    let value = String::from("owned");
    println!("{} {count}", once(|| value));
}`, '4 4\nowned 2',
 'move 闭包并不必然只实现 FnOnce；只有把捕获的非 Copy 值移出闭包等行为，才会限制重复调用。',
 '实现 ex07：返回一个计数器闭包。起始值为 start，每次调用先加 1 再返回，返回类型是 impl FnMut() -> i32。',
 '闭包必须拥有局部计数器，否则返回后引用会悬垂；用 move 捕获。',
 'fn counter(start: i32) -> impl FnMut() -> i32 { let mut n = start; move || { n += 1; n } }。本练习限定调用过程中不发生 i32 溢出。',
 [['move || s.len() 能多次调用吗？',['一定不能','可以，若没有移出 s','只有 s 是 static'],1,'它拥有 s，但读取 len 不消耗 s。'],['重复修改捕获计数器需要？',['FnMut','只有 FnOnce','只能用裸指针'],0,'FnMut 允许通过 &mut self 更新闭包环境。']],
 'https://doc.rust-lang.org/book/ch13-01-closures.html');
add('13',2,'泛型、约束与 const generics','抽象的是行为，不是“任意类型都能工作”。',[
 ['类型参数需要足够的能力','fn f<T>(x: T) 并不表示可以对 x 做任意操作。比较需要 PartialOrd/Ord，复制需要 Clone/Copy，格式化需要 Display/Debug。where 子句在多个参数或复杂约束时更易读。优先借用返回结果，能避免给泛型加上不必要的 Clone 限制。'],
 ['单态化与代码体积','普通泛型通常通过单态化为实际使用的类型生成专门实现，利于静态分派与优化，也可能增大编译时间和代码体积。impl Trait 在参数位置类似匿名泛型参数；在返回位置表示某一个具体但隐藏的类型，不是任意分支都能返回不同类型。'],
 ['常量也是参数','const N: usize 可以把数组长度纳入类型。const generics 适合固定维度或固定缓冲区，不等于可以在所有类型位置使用任意运行时表达式。泛型 T 默认有 Sized 约束；T: ?Sized 放宽它，常用于通过引用接收 str、[T] 或 trait object。']
],`fn largest<T: Ord>(items: &[T]) -> Option<&T> { items.iter().max() }
fn sum_array<const N: usize>(values: [i32; N]) -> i32 {
    values.into_iter().sum()
}
fn main() {
    let names = [String::from("apple"), String::from("pear")];
    println!("{}", largest(&names).unwrap());
    assert_eq!(largest::<i32>(&[]), None);
    println!("{}", sum_array([1, 2, 3]));
}`, 'pear\n6',
 'Ord 是全序，浮点数因为 NaN 等原因通常只实现 PartialOrd。不要不解释业务语义就强行 unwrap partial_cmp。',
 '实现 ex08：generic_max<T: Ord>(&[T]) -> Option<&T>，不要求 Clone，空输入返回 None。',
 'iter().max() 返回对原元素的借用。',
 'items.iter().max()。返回引用会关联输入的生命周期；函数不会为“最大值”创建独立副本。',
 [['返回 impl Trait 的两个分支能随意返回不同具体类型吗？',['可以','通常不可以','必须用 unsafe 才行'],1,'返回位置的 impl Trait 代表一个固定的隐藏具体类型。'],['泛型最大值仅返回借用，必须约束 Clone 吗？',['必须','不需要','必须 Copy'],1,'比较和返回引用不需要复制元素。']],
 'https://doc.rust-lang.org/book/ch10-01-syntax.html');
add('14',2,'Trait、关联类型与动态分派','把行为契约与具体存储分开。',[
 ['trait 是行为契约','trait 可以定义必需方法、默认方法和关联类型。impl Trait for Type 为类型提供能力。trait 不是类继承层次；默认方法可以复用行为，但没有传统继承的字段机制。孤儿规则限制跨 crate 实现，以维护一致性；常见办法是为外部类型建立本地 newtype 包装。'],
 ['关联类型与泛型参数','Iterator::Item 由具体 Iterator 实现确定，调用者无需每次选它。trait 的泛型参数则允许同一类型针对不同参数有不同实现，在规则允许的情况下表达多种关系。不要把两者当成仅语法不同，它们影响约束的唯一性与 API 使用方式。'],
 ['静态分派与 dyn','泛型 T: Trait 通常静态分派；&dyn Trait 或 Box<dyn Trait> 使用动态分派，可在一个集合中存放不同具体类型。dyn 的代价包括间接调用和相关优化限制；Box 还涉及拥有与分配，但 &dyn 本身不意味着新分配。只有满足 dyn compatibility 的 trait 才能构造 trait object，例如可分派方法不能随意带类型泛型参数。']
],`trait Summary { fn summary(&self) -> String; }
struct Note(String);
struct Score(u32);
impl Summary for Note { fn summary(&self) -> String { self.0.clone() } }
impl Summary for Score { fn summary(&self) -> String { format!("score={}", self.0) } }
fn show(item: &impl Summary) { println!("{}", item.summary()); }
fn main() {
    show(&Score(90));
    let items: Vec<Box<dyn Summary>> = vec![
        Box::new(Note("borrow".into())), Box::new(Score(100))
    ];
    for item in items { println!("{}", item.summary()); }
}`, 'score=90\nborrow\nscore=100',
 'dyn Trait 不是自动更灵活的默认答案；类型集合封闭时 enum 往往更直接。先看是否真的需要运行时异构。',
 '给 Summary 增加默认方法 is_empty，复用 summary；比较它和直接提供 &str 接口的分配成本。',
 '默认方法可以调用 trait 中其他方法，但 summary 当前返回 String。',
 'fn is_empty(&self) -> bool { self.summary().is_empty() }。此设计可能为检查空值分配字符串；正式 API 可把 is_empty 作为专门的无分配操作，而不是盲目复用。',
 [['Vec<Box<dyn Summary>> 的主要能力是？',['存放不同具体实现','让任何 trait 都对象安全','保证零分配'],0,'通过共同 trait object 接口容纳异构值。'],['Iterator::Item 属于？',['关联类型','运行时字符串','全局变量'],0,'它由 Iterator 的具体实现确定。']],
 'https://doc.rust-lang.org/book/ch18-02-trait-objects.html');
add('15',2,'生命周期与借用 API','生命周期标注描述关系，不延长生命。',[
 ['编译器需要知道引用来自哪里','返回一个输入的切片时，输出有效期必须受输入限制。如果函数接受多个引用且可能返回其中任一个，签名需要表达共同约束。写同一个 \'a 不要求两个实参原本存活完全一样久，而是让调用时选取满足约束的有效区域。'],
 ['先尝试省略规则','每个输入引用先获得独立的省略生命周期；只有一个输入生命周期时，输出引用通常关联它；方法有 &self 或 &mut self 时，输出引用通常关联接收者。无法推导时才显式标注。结构体保存借用要带生命周期参数，拥有 String 则通常不需要。'],
 ['static 的两个常见含义','&\'static str 是整个程序期间有效的字符串借用；T: \'static 表示 T 不包含比 static 更短的借用约束，并不表示 T 必须一直活到程序结束。拥有 String 的值可以满足 T: \'static，仍会在正常作用域结束时释放。别用泄漏内存来“修复”借用错误。'],
 ['选择拥有还是借用','短期视图适合借用；跨线程、队列、长期存储经常适合拥有数据。返回局部 String 的 &str 不合法，因为函数结束就释放了它；应返回 String，或返回真正来自输入的切片。生命周期复杂到难以维护时，检查数据结构是不是过度借用。']
],`fn longer<'a>(a: &'a str, b: &'a str) -> &'a str {
    if a.len() >= b.len() { a } else { b }
}
struct Excerpt<'a> { text: &'a str }
impl Excerpt<'_> { fn text(&self) -> &str { self.text } }
fn main() {
    let a = String::from("ownership");
    let b = String::from("borrow");
    let excerpt = Excerpt { text: longer(&a, &b) };
    println!("{}", excerpt.text());
}`, 'ownership',
 '写上 \'a 或 \'static 不会改变实际资源的释放时机。返回局部变量引用的问题不能靠多写生命周期解决。',
 '实现 ex09：longer 按 UTF-8 字节长度返回两个输入中更长者，长度相等返回第一个，零分配。',
 '两个输入和输出写同一个生命周期参数。这里比较字节长度是题目明确指定的规则。',
 'fn longer<\'a>(a: &\'a str, b: &\'a str) -> &\'a str { if a.len() >= b.len() { a } else { b } }。返回值只在两个输入都满足约束的区域内可用。',
 [['生命周期标注的作用是？',['延长值的存活','描述引用有效性的关系','自动 clone'],1,'它是编译期约束，不是运行时资源管理操作。'],['String 能满足 T: static 吗？',['能，因为它拥有数据','不能，它会释放','只有泄漏后才行'],0,'类型的 static 约束不意味着该值永不析构。']],
 'https://doc.rust-lang.org/book/ch10-03-lifetime-syntax.html');
add('16',2,'模块、crate、package 与可见性','让依赖方向清楚，而不是文件越拆越多。',[
 ['四个层次','package 由 Cargo.toml 定义，可以含一个库 target 和多个二进制 target；crate 是编译单元，通常有一个根；module 组织 crate 内命名空间；use 把路径引入当前作用域。mod 声明模块，use 不会自动加载任意磁盘文件。'],
 ['文件映射与路径','src/lib.rs 是库根，src/main.rs 是默认二进制根；src/bin/name.rs 可以成为额外二进制。mod storage; 通常对应 storage.rs 或 storage/mod.rs，选一种组织方式。crate:: 从当前 crate 根出发，super:: 指向父模块，self:: 指向当前模块。'],
 ['收窄公开接口','pub 暴露 API，pub(crate) 限制在 crate 内，pub(super) 限制在父级可见范围。结构体本身公开不代表所有字段都公开；enum 的公开变体规则不同。pub use 可重导出稳定入口，把内部文件布局与外部 API 分开。'],
 ['综合项目采用的边界','把解析与业务规则放进库，让 main 只处理参数、终端和退出码。存储层返回数据与错误，不直接 println；展示层决定文本格式。单向依赖能让业务测试不需要启动终端或访问真实用户目录。']
],`mod domain {
    #[derive(Debug)]
    pub struct Topic { name: String }
    impl Topic {
        pub fn new(name: &str) -> Self { Self { name: name.into() } }
        pub fn name(&self) -> &str { &self.name }
    }
}
use domain::Topic;
fn main() {
    let topic = Topic::new("modules");
    println!("{}", topic.name());
    // topic.name 不可从这里直接读取：字段私有。
}`, 'modules',
 'main.rs 与 lib.rs 是同一个 package 中的不同 crate 根；二进制使用库时通常通过包名对应的 crate 名导入。',
 '把本章内联 domain 模块拆成 domain.rs，并解释 mod domain 与 use domain::Topic 的区别。',
 'mod 建立模块树，use 缩短名字。文件应位于声明模块的对应目录。',
 'main.rs 放 mod domain; use domain::Topic;；domain.rs 放 Topic 定义和实现。无需在 domain.rs 再包一层 mod domain，否则路径会多一层。',
 [['use storage::Store 会自动声明 storage 模块吗？',['会','不会','只有 release 会'],1,'需要 mod 声明或来自外部 crate 的路径。'],['希望仅 crate 内可见，使用？',['pub(crate)','pub 全部公开','static'],0,'显式限制可见性可以保留内部重构空间。']],
 'https://doc.rust-lang.org/book/ch07-02-defining-modules-to-control-scope-and-privacy.html');
add('17',2,'测试、文档测试与调试','为行为写证据，为边界写反例。',[
 ['测试的三种尺度','单元测试常放在源文件里的 #[cfg(test)] mod tests 中，可访问父模块私有实现；集成测试放 tests/，从外部使用公开 API；文档中的 Rust 代码块可成为 doctest。把纯计算从 I/O 中分离，测试就能快速、确定、容易定位。'],
 ['测试什么比测试数量重要','覆盖正常值、空值、最小最大值、错误输入、重复操作与状态变化。assert_eq! 用于具体预期；should_panic 只适合约定必须 panic 的 API，普通错误应断言 Result。不要只把实现重新写一遍当预期，应使用具体案例或独立的不变量。'],
 ['运行和定位','cargo test 运行测试；cargo test name 过滤；-- --nocapture 展示输出；-- --test-threads=1 可辅助排查共享环境干扰。测试默认可并行，因此不要共享固定临时文件名或依赖测试执行顺序。dbg! 打印表达式和位置并返回原值，RUST_BACKTRACE=1 帮助分析 panic。'],
 ['格式与静态分析','cargo fmt 统一格式，cargo clippy 提供更多静态建议，cargo doc 构建文档；三者都不能替代业务测试。修 Clippy 时理解建议的语义，别为消除提示而改变错误处理或偷偷丢弃数据。编译失败测试可通过 compile_fail 文档块明确记录某种误用不应编译。']
],`fn clamp(n: i32, min: i32, max: i32) -> i32 { n.max(min).min(max) }
fn main() {
    assert_eq!(clamp(-2, 0, 10), 0);
    assert_eq!(clamp(5, 0, 10), 5);
    assert_eq!(clamp(20, 0, 10), 10);
    println!("3 boundary checks passed");
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn boundaries() {
        assert_eq!(clamp(0, 0, 10), 0);
        assert_eq!(clamp(10, 0, 10), 10);
    }
}`, '3 boundary checks passed',
 '本章 clamp 示例假设 min <= max。正式 API 应决定非法区间是 Result、panic 还是另一个契约，并测试它。',
 '为 ex03 补充至少五个独立案例：空串、全空白、中文、前导空白、多行。然后执行 cargo test ex03。',
 '测试里直接比较 Option<&str>；None 的类型可由函数返回值推导。',
 '断言 first_word("")==None，first_word(" \\t")==None，first_word("你好 Rust")==Some("你好")，first_word("  rust")==Some("rust")，first_word("\\nrust\\nlang")==Some("rust")。',
 [['集成测试主要使用？',['公开 API','任意私有字段','编辑器缓存'],0,'集成测试作为外部使用者检验公共契约。'],['多个测试共用固定文件名的风险？',['并行时互相干扰','测试必定更快','没有风险'],0,'应为测试分配独立临时目录或注入存储。']],
 'https://doc.rust-lang.org/book/ch11-03-test-organization.html');
add('18',3,'Box、Rc、Weak 与内部可变性','按所有权关系选择指针，而不是背模板。',[
 ['Box 与递归类型','Box<T> 拥有堆上的 T，自身具有已知大小，因此可用于打断递归类型的无限大小。Box 不提供共享所有权，也不天然提供并发能力。Deref 让指针包装可以借用目标；Drop 用于资源释放，RAII 不只管理内存，也管理锁、文件等资源。'],
 ['Rc 与 Weak','Rc<T> 为单线程提供引用计数共享所有权；clone 增加强引用计数，最后一个强引用释放时销毁 T。两个 Rc 强引用互相指向可形成环，导致资源不释放。Weak 不维持 T 存活，upgrade 返回 Option<Rc<T>>，适合父指针、缓存和观察者。'],
 ['内部可变性不是取消规则','Cell<T> 适合通过替换或 Copy 取值更新简单数据；RefCell<T> 在运行时检查借用。borrow_mut 与活跃 borrow 冲突会 panic，try_borrow_mut 可返回错误。Rc<RefCell<T>> 常用于单线程可变图结构，但不要因此跳过更简单的独占结构设计。'],
 ['并发需要另一组类型','Rc 和 RefCell 不能直接用作跨线程共享可变数据方案。Arc 提供线程安全引用计数，但 T 的线程安全性仍然重要；可变访问通常需要 Mutex、RwLock 或原子类型。Arc<RefCell<T>> 并不会神奇地变成安全跨线程容器。']
],`use std::cell::RefCell;
use std::rc::Rc;
fn main() {
    let data = Rc::new(RefCell::new(vec!["ownership"]));
    let other = Rc::clone(&data);
    other.borrow_mut().push("borrowing");
    println!("{} {}", data.borrow().len(), Rc::strong_count(&data));
    let weak = Rc::downgrade(&data);
    drop(other);
    drop(data);
    assert!(weak.upgrade().is_none());
    println!("released");
}`, '2 2\nreleased',
 'RefCell 的借用检查失败是运行时错误；它不是“允许两个可变引用同时有效”的许可证。',
 '构造 Rc<RefCell<Vec<i32>>>，保留一个 borrow()，再调用 try_borrow_mut()，验证得到 Err；释放前者后再试。',
 '把 Ref 绑定在变量里，再 drop(guard)，明确结束借用。',
 'let guard = data.borrow(); assert!(data.try_borrow_mut().is_err()); drop(guard); assert!(data.try_borrow_mut().is_ok());。不要用 borrow_mut 触发 panic 来表达可恢复冲突。',
 [['Weak 的主要作用？',['不延长对象存活的引用','让对象永不释放','自动互斥'],0,'upgrade 明确处理对象可能已经释放的情况。'],['Arc<RefCell<T>> 自动支持跨线程共享吗？',['支持','不支持','仅 Windows 支持'],1,'Arc 只处理引用计数原子性，内部类型仍需满足对应 Send/Sync 条件。']],
 'https://doc.rust-lang.org/book/ch15-05-interior-mutability.html');
add('19',3,'线程、Send、Sync 与作用域线程','并发安全从数据边界开始。',[
 ['线程拥有独立执行进度','thread::spawn 启动操作系统线程，返回 JoinHandle。join 等待完成并返回线程结果或 panic 信息。主线程退出可能终止仍运行的其他线程，因此需要明确 join 或应用生命周期。move 常用于把拥有的数据移入线程闭包。'],
 ['Send 与 Sync 的含义','Send 表示值可以在线程间转移；Sync 表示共享引用 &T 可以在线程间转移，等价地关联 &T: Send。它们通常由成员类型自动推导。不要自行 unsafe impl 来消除报错，除非能够证明同步与别名不变量。内存安全也不等于没有死锁或业务竞态。'],
 ['为什么 spawn 要 static','普通 spawn 的闭包可能比调用函数活得更久，所以捕获的借用不能指向即将销毁的局部数据。thread::scope 保证子线程在作用域退出前结束，允许借用作用域内的数据。对有限批次的并行任务，它可以避免不必要的 Arc 或 clone。']
],`use std::thread;
fn main() {
    let values = [1_i32, 2, 3, 4];
    let total = thread::scope(|scope| {
        let left = scope.spawn(|| values[..2].iter().sum::<i32>());
        let right = scope.spawn(|| values[2..].iter().sum::<i32>());
        left.join().unwrap() + right.join().unwrap()
    });
    println!("{total}");
}`, '10',
 'spawn 两个线程不保证比单线程快。线程创建、同步和数据搬运有成本，短任务应先测量。',
 '实现 ex10：把 &[i32] 拆成两半，通过 thread::scope 分别求 i64 和，最后合并；空输入也应返回 0。',
 'split_at(len / 2)；线程闭包只读借用两段切片，join 后求和。',
 '使用 thread::scope，在两个 scope.spawn 闭包中 iter().map(|&x| i64::from(x)).sum::<i64>()。对 join 的错误策略需明确；练习按内部不变量使用 expect。',
 [['Send 表达？',['值可在线程间转移','一定是 Copy','自动加锁'],0,'Send 是线程转移能力，不是复制或同步操作。'],['scope 允许借用局部数据，因为？',['保证作用域结束前线程结束','延长所有数据到 static','关闭借用检查'],0,'结构化生命周期让编译器能证明借用有效。']],
 'https://doc.rust-lang.org/std/thread/fn.scope.html');
add('20',3,'Mutex、Channel 与原子操作','选一种状态协调方式，并明确退出条件。',[
 ['共享内存与消息传递','Arc<Mutex<T>> 允许多个线程共享一个由互斥锁保护的值；锁的 guard 在 Drop 时释放。通道把数据所有权交给接收端，减少共享状态；std::sync::mpsc 是多生产者、单消费者。sync_channel 的有界容量可以施加背压，避免无限堆积消息。'],
 ['锁的正确使用方式','临界区尽量短，不在持锁时做慢 I/O 或调用未知回调。多个锁要有一致的获取顺序。标准 Mutex 的锁中毒意味着某个线程可能在持锁时 panic，需要决定状态是否仍可恢复；不要把所有 PoisonError 都静默忽略。死锁和高层逻辑竞态仍可能出现在完全 safe 的 Rust 程序中。'],
 ['通道关闭与退出','接收端迭代会等待，直到所有发送端都被丢弃。若主线程忘记 drop 原始 sender，即使所有工作线程结束，接收循环也可能一直等。关闭协议应区分正常完成、错误中止与取消。原子类型适合简单独立计数或标志；Relaxed 不提供跨位置的同步顺序，不能随意替代 Mutex。']
],`use std::sync::mpsc;
use std::thread;
fn main() {
    let (tx, rx) = mpsc::channel();
    let handle = thread::spawn(move || {
        for n in [2, 4, 6] { tx.send(n).unwrap(); }
    });
    let total: i32 = rx.into_iter().sum();
    handle.join().unwrap();
    println!("{total}");
}`, '12',
 '通道等待不是“自动知道没有任务了”。它观察的是发送端存活情况或显式协议。',
 '把示例改成两个生产线程，各发送三个值。保留句柄并 join，收集结果后排序以消除调度顺序差异。',
 '克隆 sender 后，把主线程原始 sender 丢弃，再进入接收迭代。',
 '创建 tx1 = tx.clone()，分别 move 进两个线程；drop(tx) 或把原始 tx 移进其中一个线程。接收结果排序后比较集合内容，不断言线程消息的交错顺序。',
 [['所有工作线程已结束，但 rx 仍等待，可能因为？',['主线程仍持有 sender','Rust 不支持通道','少写一个 clone'],0,'所有 sender 必须销毁或按协议发结束消息。'],['safe Rust 能完全防止死锁吗？',['能','不能','只在 debug 能'],1,'类型系统防止某类内存错误，不保证业务级活性。']],
 'https://doc.rust-lang.org/book/ch16-02-message-passing.html');
add('21',3,'async、await 与 Future','异步是可暂停的计算，不等于自动并行。',[
 ['调用 async fn 会得到 Future','async fn 的调用先构造 Future，函数体通常在 future 被 poll 时推进。await 等待另一个 Future；当它尚未就绪时，当前任务可以把执行机会让给其他任务。普通同步函数里不能直接 await。两个连续的 await 默认先后等待，不会自动把两个任务同时调度。'],
 ['语言与运行时分工','语言提供 async/await 与 Future 抽象，标准库提供 Poll、Context、Waker 等基础接口；网络事件循环、计时器、任务调度通常来自 Tokio 等运行时。Future::poll 返回 Ready(value) 或 Pending；Pending 时必须安排在进展可能发生后唤醒任务。不能无条件忙循环 poll，下面例子只轮询明确立即就绪的 Future。'],
 ['取消、阻塞与任务边界','丢弃 Future 通常意味着不再继续轮询，但已经发生的副作用不会回滚，已启动的外部操作也不一定取消。async 块中调用 std::thread::sleep 会阻塞工作线程；慢 CPU 工作或阻塞库需要明确移出异步调度线程。spawn 的任务拥有独立生命周期，必须考虑 join、取消和错误传播。'],
 ['一个实用判断','等待大量 I/O 时异步可能有效；纯 CPU 运算并不会因为 async 变快。先写正确的同步业务内核，再在边界引入异步 I/O。不要为了套用 async 而把每个函数都改成 async，也不要持有不适合跨 await 的锁 guard。']
],`use std::future::Future;
use std::task::{Context, Poll, Waker};
async fn double(n: i32) -> i32 { n * 2 }
fn main() {
    let mut future = Box::pin(async { double(21).await });
    let mut context = Context::from_waker(Waker::noop());
    match future.as_mut().poll(&mut context) {
        Poll::Ready(value) => println!("{value}"),
        Poll::Pending => panic!("本例不包含真正挂起的操作"),
    }
}`, '42',
 '此例是 Future 机制演示，不是通用 executor。真实网络或定时器 Future 需要可唤醒的调度器和对应运行时。',
 '把两个 double 调用放进同一个 async 块，并说明先后 await 与并发调度的区别。完成后阅读附带 tokio-lab 的超时与取消示例。',
 '即使 Future 很快完成，语义仍然是先完成第一个 await 再执行后面的表达式。',
 'let a = double(10).await; let b = double(20).await; a + b。它们顺序完成；Tokio 的 join! 可以并发轮询多个 Future，但并发轮询本身不意味着两个 CPU 核同时执行。',
 [['调用 async fn 后，函数体一定已经运行完吗？',['是','否，得到一个 Future','自动新建线程'],1,'Future 的执行依赖被轮询。'],['async 任务中 thread::sleep 的影响？',['只暂停当前 Future','阻塞执行它的线程','自动转为 Tokio timer'],1,'阻塞操作不会因为处于 async 块中就自动异步化。']],
 'https://doc.rust-lang.org/book/ch17-01-futures-and-syntax.html');
add('22',3,'Pin、Unpin 与异步工程','理解保证的边界，比背类型签名更重要。',[
 ['为什么需要 Pin','有些类型的正确性依赖值的地址保持稳定，例如含内部指向自身数据关系的状态机。Pin<P> 在相应契约下限制被指向值的移动；被固定的是 pointee，而不是要求指针包装本身永远不能移动。Box::pin 可以在堆上固定值。Pin 不会自动解决别名、线程安全或初始化问题。'],
 ['Unpin 表达什么','多数普通类型实现 Unpin，表示它们不依赖固定地址保证，可以从固定引用安全获取普通可变访问。某些 async 状态机可能是 !Unpin。调用 Future::poll 需要 Pin<&mut Self>；使用运行时和高级组合器时，通常不必手写 unsafe pin 投影。'],
 ['异步锁、超时与取消','标准 Mutex 的 guard 不宜跨 await；优先在 await 前完成短临界区，或在必要时使用异步锁。timeout 包装等待过程，超时后应明确重试是否会重复副作用。select! 选出先完成分支，但要检查另一个分支被取消时是否丢失部分读写进度。网络协议应设计幂等键、帧边界与有界缓冲。'],
 ['spawn 所需的 Send 与 static','多线程 executor 可能在线程间移动任务，所以 spawn 往往要求 Future: Send + \'static。真正需要跨 await 保存的局部状态会进入 Future；如果其中含不满足 Send 的值，任务就无法在这些调度器上 spawn。解决方向是缩短其作用域、改变数据所有权，或使用适当的本地任务机制，而不是盲目增加 Arc。']
],`use std::pin::Pin;
fn main() {
    let mut pinned = Box::pin(String::from("Rust"));
    // String: Unpin，因此这里可以获得普通 &mut String。
    let text: &mut String = Pin::as_mut(&mut pinned).get_mut();
    text.push_str(" async");
    let moved_handle = pinned; // 移动 Box 句柄，不搬动它指向的分配
    println!("{moved_handle}");
}`, 'Rust async',
 'Pin 不是“把任何变量变得不可变”。它关注移动与地址相关契约，仍可能通过符合规则的 API 修改内容。',
 '在 tokio-lab 中先阅读任务、通道、超时三个测试；说明 timeout 超时为什么不等于数据库事务自动回滚。',
 '区分停止等待、丢弃 Future、取消底层操作、撤销已经发生的副作用。',
 'timeout 限制等待时长，无法通用地撤销已提交的写操作。业务需靠事务、幂等键或补偿逻辑提供更强语义。并发取消的正确性必须由具体 API 契约保证。',
 [['Pin<Box<T>> 固定的主要对象是？',['Box 句柄变量本身','指针指向的 T','所有关联全局变量'],1,'指针包装可以移动，固定的是 pointee 的相关地址保证。'],['超时必然撤销全部副作用吗？',['是','不是','仅 release 会'],1,'停止等待和业务回滚是不同层次的机制。']],
 'https://doc.rust-lang.org/std/pin/');
add('23',3,'宏、属性与条件编译','需要语法抽象时，再走进宏系统。',[
 ['宏与普通函数不同','函数接收运行时值，宏处理 token 并在编译流程中展开成代码。println!、vec!、assert_eq! 是常见宏。优先用函数、泛型、trait 解决普通抽象；宏适合可变参数、代码生成或不能直接由函数表达的语法模式。'],
 ['macro_rules 的匹配与重复','声明宏使用模式捕获，如 $name:ident、$value:expr、$ty:ty；$(... ),* 表示按分隔符重复，$(,)? 接受可选尾逗号。宏展开仍然必须通过普通类型检查和借用检查，宏不绕过语言规则。跨 crate 宏引用自身 crate 项时，$crate 有专门用途。'],
 ['过程宏与 cfg','derive 宏、属性宏和函数式过程宏运行在编译时，通常位于 proc-macro crate，消费并生成 TokenStream；它们不是运行时反射。#[cfg(...)] 在条件不满足时移除代码，cfg!(...) 产生布尔值，但分支中的代码仍可能需要通过类型检查。feature 是包定义的条件选项，不应自动当作安全边界。']
],`macro_rules! labels {
    ($($value:expr),* $(,)?) => {
        vec![$($value.to_string()),*]
    };
}
fn main() {
    let topics = labels!["ownership", "borrow", 2024,];
    println!("{}", topics.join(" / "));
    assert!(cfg!(any(target_pointer_width = "32", target_pointer_width = "64")));
}`, 'ownership / borrow / 2024',
 '宏把参数表达式展开多次可能导致副作用重复执行。设计宏时明确求值次数，必要时先绑定局部变量。',
 '扩展 labels! 支持零个参数；观察类型推断是否需要标注 Vec<String>。',
 '重复次数 * 允许零个；但空 vec! 缺乏元素类型上下文。',
 'let empty: Vec<String> = labels![]; assert!(empty.is_empty());。语法允许零项不代表类型总能自动推导。',
 [['cfg!(...) 与 #[cfg(...)] 相同吗？',['相同','不同，前者是布尔表达式','前者只能运行时读取系统'],1,'条件属性会在对应编译条件下移除项或代码，cfg! 不等同于移除。'],['宏生成代码还要接受借用检查吗？',['要','不要','仅导出的宏需要'],0,'展开后的普通 Rust 代码仍受类型和借用规则约束。']],
 'https://doc.rust-lang.org/book/ch20-05-macros.html');
add('24',3,'unsafe、裸指针与 FFI','把无法由编译器验证的证明缩到最小。',[
 ['unsafe 不会关闭所有检查','unsafe 允许执行若干额外操作，例如解引用裸指针、调用 unsafe 函数、访问某些可变静态状态等；普通类型和借用规则仍在。未定义行为在 unsafe 内外都不允许。一次运行结果看起来正常不代表代码 sound。'],
 ['安全封装要证明什么','解引用前需要有效地址、正确对齐、已初始化且符合类型有效性的值，并遵守别名和生命周期要求。封装的安全函数必须确保任意合法 safe 调用者都无法触发 UB。写 SAFETY 注释解释具体前提为何成立，比只写“这里安全”更有价值。'],
 ['FFI 是契约边界','extern "C" 使用 C ABI；#[repr(C)] 控制适合 C 互操作的布局，但不能自动让任意 Rust 类型成为安全 C 接口。String、Vec、trait object 不应直接当成 C 稳定布局对象。跨边界需要清楚规定分配与释放方、长度、编码、空指针、错误和 panic 策略；CString 可处理以 NUL 结尾的字符串需求。'],
 ['2024 的显式 unsafe','edition 2024 对 unsafe fn 内部的 unsafe 操作默认提示显式 unsafe 块；extern 块与部分属性也有相应安全声明要求。unsafe fn 声明调用者必须满足额外条件，unsafe 块则表明作者在局部承担证明责任。Miri 可以帮助发现一部分 UB，但不能作为所有正确性的证明。']
],`fn first(values: &[i32]) -> Option<i32> {
    if values.is_empty() { return None; }
    let ptr = values.as_ptr();
    // SAFETY: 非空切片的首元素已初始化、对齐且在此调用期间存活；
    // 只读取 Copy 值，不创建可变别名。
    Some(unsafe { *ptr })
}
fn main() {
    assert_eq!(first(&[]), None);
    println!("{:?}", first(&[7, 8]));
    // 实际业务直接 values.first().copied() 更合适。
}`, 'Some(7)',
 '此处 unsafe 仅用于解释证明义务。实际代码有安全 API 时，应直接使用安全 API，不能把 unsafe 当性能捷径。',
 '把示例完全改写为 safe Rust；然后列出原始裸指针读取至少三个必须成立的前提。',
 '切片 first 返回 Option<&i32>，copied 转为 Option<i32>。',
 'values.first().copied()。原始实现需要非空保证、对齐、已初始化的 i32、有效生命周期和读取不违反别名约束；安全 API 封装了这些细节。',
 [['unsafe 块内 UB 是否允许？',['允许','不允许','debug 允许'],1,'unsafe 只是把证明责任交给程序员，不允许未定义行为。'],['repr(C) 能让 String 自动成为合适的 C 参数吗？',['能','不能','只要 clone 就行'],1,'布局、拥有权和 ABI 都必须按边界协议设计。']],
 'https://doc.rust-lang.org/reference/behavior-considered-undefined.html');
add('25',4,'API 设计与常用 trait','让调用者容易做对，也容易处理失败。',[
 ['参数签名就是文档','只读文本优先 &str、只读序列优先 &[T]；确实存入结构体或转交线程时再接收 String/Vec。Into<String> 让调用方便，但意味着可能分配和拥有；AsRef<Path> 适合路径输入。不要把所有参数一律变成泛型，过多类型参数会增加错误消息复杂度。'],
 ['转换与展示','From<T> 表示约定上的不失败转换；TryFrom<T> 表达可能失败。实现 From 后通常自动获得反向的 Into 便利。Display 面向稳定的用户展示，Debug 面向调试；FromStr 适合文本解析。Default 应是合理初始值，而不是随便挑一个状态以满足语法。'],
 ['让非法状态难以构造','newtype、私有字段、返回 Result 的构造器能落实领域规则。Builder 适合可选参数较多的对象，build 阶段验证必需信息。typestate 用类型区分阶段，如 Draft 与 Published，能在编译期限制方法，但也会提高复杂度，适合确实重要的流程约束。'],
 ['Cow 与借用优化','Cow<\'a, str> 可以在无需修改时借用、需要修改时拥有，适合正规化或转义接口。它不是所有字符串 API 的默认选择，只有借用路径常见且分配成本确实值得关心时才使用。稳定公共 API 的变更要考虑调用者兼容性和错误类型扩展。']
],`use std::borrow::Cow;
use std::fmt;
struct UserId(u64);
impl fmt::Display for UserId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "user-{}", self.0)
    }
}
fn normalize(text: &str) -> Cow<'_, str> {
    if text.contains('_') { Cow::Owned(text.replace('_', "-")) }
    else { Cow::Borrowed(text) }
}
fn main() {
    println!("{} {}", UserId(7), normalize("rust_notes"));
    assert!(matches!(normalize("rust"), Cow::Borrowed(_)));
}`, 'user-7 rust-notes',
 'From 不应通过 panic 来伪装可失败转换。输入可能不合法时使用 TryFrom 或显式 Result 构造器。',
 '实现 ex11：把下划线替换成短横线，返回 Cow<str>；没有下划线时必须走 Borrowed 路径。',
 '测试不仅检查字符串值，还用 matches! 检查 Borrowed 与 Owned 变体。',
 'if text.contains(\'_\') { Cow::Owned(text.replace(\'_\', "-")) } else { Cow::Borrowed(text) }。这体现值相同与分配行为相同是两个测试维度。',
 [['可能失败的数字转换应该实现？',['TryFrom','From 后随意 panic','Debug'],0,'TryFrom 的错误类型明确表达失败。'],['Cow 的典型用途是？',['借用或拥有两种路径','自动跨线程锁','避免所有内存分配'],0,'修改路径仍可能分配；收益来自无需修改时借用。']],
 'https://doc.rust-lang.org/std/borrow/enum.Cow.html');
add('26',4,'Cargo、依赖、features 与 edition','把可重复构建作为项目的一部分。',[
 ['清单和锁文件负责不同事情','Cargo.toml 声明包、目标和依赖约束；Cargo.lock 记录解析后的依赖版本。应用通常应保留锁文件，让部署和 CI 使用 --locked 检查它没有悄悄改变。--offline 只能使用已缓存依赖，不会让缺少的依赖凭空出现；本项目核心练习与综合项目零第三方依赖。'],
 ['features 与 workspace','feature 用于选择可选能力，依赖图中同一包的 features 通常会合并，因此设计时应尽量可叠加。workspace 协调多个包、共享目标目录与配置。本练习包显式放在独立 workspace 中，避免与现有博客工程的依赖和构建策略耦合。dev-dependencies 只用于测试、示例等开发目标，build-dependencies 用于构建脚本。'],
 ['edition 迁移不是盲改一行','edition 是包级选择，不同 edition 的 crate 可以共同工作。迁移旧项目先提交干净基线、运行测试，再参考 cargo fix --edition 和 Edition Guide，最后检查行为变化及 lint。2024 的变化包括部分匹配规则、临时值作用域、unsafe 声明和 impl Trait 捕获规则；不要把本课程当作所有迁移细节的替代。'],
 ['建议的交付检查','本项目提供 cargo fmt --check、cargo test、cargo check --all-targets 和示例运行流程。生产项目还应明确最低支持 Rust 版本、目标平台、依赖更新策略、凭据与构建环境。版本号不是质量保证，升级后要运行与你业务相关的测试。']
],`fn main() {
    println!("{} {}", env!("CARGO_PKG_NAME"), env!("CARGO_PKG_VERSION"));
    println!("debug_assertions={}", cfg!(debug_assertions));
}`, 'rust-reboot-workbook 0.1.0\ndebug_assertions=true（默认 debug profile）',
 'features 不是独立进程隔离或权限系统。把敏感操作藏在 feature 后不等于具有运行时访问控制。',
 '打开 workbook/Cargo.toml，解释 default = [] 与 solutions = []。先运行默认测试，再运行 --features solutions 对比。',
 '默认路径加载 starter.rs，solutions feature 加载 solutions.rs；两者接受同一组测试。',
 '默认测试失败代表练习尚未完成，并不是项目损坏。--features solutions 检验参考实现；做题时不要一直打开 solutions，否则测到的不是你的代码。',
 [['--offline 能下载缺失依赖吗？',['能','不能','只下载 dev-dependencies'],1,'offline 只能使用本地可用资源。'],['不同 edition 的 crate 能一起使用吗？',['能','不能','只能同一作者'],0,'edition 的选择逐包生效，生态兼容性设计允许它们互操作。']],
 'https://doc.rust-lang.org/edition-guide/rust-2024/index.html');
add('27',4,'文件、路径与持久化','磁盘不是一个永远成功的 HashMap。',[
 ['路径不等于 UTF-8 文本','Path/PathBuf 表示平台路径，OsStr/OsString 表示系统字符串；不要随意 to_str().unwrap()。read_to_string 要求文件内容是有效 UTF-8；读取任意二进制用 read。BufRead::lines 可流式逐行处理，但每行也可能产生 I/O 或解码错误，不能简单 flatten 丢弃。'],
 ['区分不存在和损坏','文件不存在可以根据业务创建空数据库；权限错误、非法编码、格式损坏不应该被当成空数据继续覆盖。解析时验证字段数量、ID 唯一性、状态枚举和文本转义规则。综合项目采用严格行格式，拒绝损坏输入并保留原文件。'],
 ['写入、替换与平台差异','直接覆盖文件时，崩溃或写入失败可能留下不完整内容。常见改进是写同目录临时文件、flush/sync，再替换旧文件；但替换原子性、覆盖行为、目录持久化和多进程并发依赖具体平台与文件系统，不能仅凭 rename 就宣布事务安全。本课程参考实现明确是单进程学习版本，写入前保留备份，不宣称崩溃原子性。'],
 ['可测试 I/O 设计','纯函数负责 encode/decode，边界函数负责 read/write。测试在独立临时目录工作，验证往返、损坏输入、空文件、备份和重载。真正要支持多人或多进程写入时，应采用可靠锁协议或数据库，并设计迁移和恢复流程。']
],`use std::io::{self, BufRead, Cursor};
fn read_numbers(reader: impl BufRead) -> Result<Vec<i32>, Box<dyn std::error::Error>> {
    let mut values = Vec::new();
    for line in reader.lines() {
        let line = line?;
        if line.trim().is_empty() { continue; }
        values.push(line.trim().parse()?);
    }
    Ok(values)
}
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let input = Cursor::new(b"10\\n\\n20\\n");
    println!("{:?}", read_numbers(input)?);
    let _kind = io::ErrorKind::NotFound;
    Ok(())
}`, '[10, 20]',
 'unwrap_or_default 处理文件读取错误可能把权限问题或数据损坏误当成“空数据库”，然后覆盖原数据。',
 '实现 ex12：给任务标题转义反斜线、制表符与换行，再实现严格反转义。非法 \\q 和末尾单独反斜线返回错误。',
 'encode 用 chars 遍历；decode 遇到反斜线后消费下一项并匹配 n、t、反斜线。',
 '转义必须先定义协议：\\\\ 表示反斜线，\\t 表示制表符，\\n 表示换行。测试 decode(encode(text)) == text，同时测试非法转义而不是默默保留它。',
 [['文件读取报 PermissionDenied 应默认清空数据吗？',['应该','不应该，应传播错误','忽略后覆盖'],1,'读失败不等于不存在，错误恢复不能破坏已有数据。'],['任意路径适合保存为 String 吗？',['不一定，应使用 PathBuf','总是','只有 Linux 例外'],0,'平台路径不保证能无损表示为 UTF-8 字符串。']],
 'https://doc.rust-lang.org/std/io/trait.BufRead.html');
add('28',4,'性能、调试与常见编译错误','先测量，再改变数据结构。',[
 ['优化顺序','先确认正确性和工作负载，再用 release 构建测量。首先检查算法复杂度、I/O 次数和分配，再看复制、锁竞争与缓存局部性。微基准应防止常量折叠和死代码删除；std::hint::black_box 能辅助构造基准，但不能保证测量天然可靠。'],
 ['常见低风险改进','已知大小时预留 Vec 容量；只读参数使用切片；避免为查找创建 String；把循环外不变计算移出循环；迭代器直接归约避免中间 Vec。不要默认手写下标比迭代器快，也不要默认每个 clone 都昂贵。Rc::clone 和 String::clone 的成本模型不同。'],
 ['把错误码转成设计问题','E0382 常提示移动后继续使用，问“是否只需借用”；E0499 常提示多次可变借用，问“是否需要拆分数据或作用域”；E0502 常提示共享与可变借用重叠，问“引用最后使用能否提前”；E0597 常提示借用值不够长寿，问“应拥有还是借用”；E0277 常提示 trait 约束不满足，问“实际类型提供何种能力”。'],
 ['更深的工具有适用边界','Clippy 检查模式，Miri 动态执行并发现部分 UB，性能分析器定位热点，sanitizer 需要相应工具链与平台。不要用关闭检查、任意 unsafe 或无差别 Arc<Mutex<_>> 来解决理解问题。性能优化应有前后相同场景的测量与测试证据。']
],`use std::hint::black_box;
use std::time::Instant;
fn main() {
    let values: Vec<u64> = (0..10_000).collect();
    let start = Instant::now();
    let total: u64 = black_box(&values).iter().sum();
    let elapsed = start.elapsed();
    assert_eq!(total, 49_995_000);
    println!("sum={total}; elapsed={elapsed:?}");
    // 单次时长只作工具演示，不构成可信性能结论。
}`, 'sum=49995000; elapsed=…（时间依机器和运行情况而变化）',
 '一次 debug 构建的计时不能用来比较算法性能；短任务还容易被计时噪声、调度和缓存状态影响。',
 '把求和改成先 map 收集再 sum 与直接 sum 两版，保持断言一致。思考如何构造足够大、可重复的基准。',
 '首先确认两版做同样的工作；分配是否纳入计时必须保持一致。',
 '使用 release、多个输入规模和重复测量，记录环境并防止优化器移除计算。若测量差异不稳定，应报告不确定，不能挑最快一次下结论。',
 [['遇到 E0382 首先应思考？',['谁拥有值、是否只需借用','把所有值 clone','加 unsafe'],0,'所有权设计通常比补 clone 更重要。'],['单次 debug 计时足以证明优化有效吗？',['足以','不足以','只要数字小就行'],1,'构建配置和噪声会严重影响判断。']],
 'https://doc.rust-lang.org/error_codes/error-index.html');
add('29',5,'综合项目：Rust Trail','交付一个真正能保存学习任务的 CLI。',[
 ['你要完成的产品','Rust Trail 是本地学习任务管理器，支持 add、list、done、remove、find、stats。任务包含唯一 ID、标题和完成状态，退出后重启仍可读取数据。所有业务规则放在 lib.rs，main.rs 负责终端交互；零第三方依赖，离线可构建。下载包含完整参考实现，不要求你从页面手抄所有文件。'],
 ['六个可验收里程碑','M1 建立 Task 与 Store，拒绝空标题；M2 完成增加、完成、删除、查询及统计；M3 定义严格的文本序列化和转义；M4 实现文件加载、保存与备份；M5 实现参数解析、帮助和非零错误退出码；M6 完成测试、格式检查与实际重启验证。每完成一层再接下一层，先在内存中验证，再碰文件。'],
 ['关键设计决策','用 enum 表达错误，保留 I/O 来源；ID 使用 checked_add 防止回绕；数据库头部保存 next_id，删除最高 ID 后也不复用旧 ID。解析拒绝重复 ID、非法状态、无效转义或错误头部。查询只借用数据，变更通过 &mut self；编码单独输出 String，便于往返测试。'],
 ['交付边界与升级方向','参考版支持单进程串行使用；更新前创建 .bak 备份，备份失败就停止保存。直接写入仍不是崩溃原子事务，不支持多个进程同时编辑。学习升级任务：可靠替换与恢复、文件锁、SQLite 迁移、标签与截止时间、serde JSON、clap 参数解析。不要把学习版当成已经具备数据库级并发保证的服务。'],
 ['从复习过渡到独立实现','先只看 README 的需求和测试，自己新建一份实现；卡住时回到相应章节，而不是直接复制答案。完成后与 reference 比较错误建模、借用签名、模块边界和测试覆盖。能独立修改格式并迁移旧数据，才说明掌握了组合使用这些语言能力。']
],`#[derive(Debug)]
struct Task { id: u64, title: String, done: bool }
fn main() {
    let mut tasks = vec![Task { id: 1, title: "复习借用".into(), done: false }];
    tasks[0].done = true;
    let completed = tasks.iter().filter(|task| task.done).count();
    for task in &tasks { println!("{} {} {}", task.id, task.done, task.title); }
    println!("completed={completed}");
    // 完整实现位于 capstone/src/，包含存储、CLI 与错误处理。
}`, '1 true 复习借用\ncompleted=1',
 '不要把上面的数据模型缩略示例误当成完整项目；下载包中的 capstone 才包含可运行的全部功能和测试。',
 '按综合项目页面的六个里程碑独立实现。在空目录用 --file 指定演示数据库，依次 add、done、stats，退出重启后 list。',
 '先复制 capstone/README.md 的验收清单，避免一开始被命令行解析与文件 I/O 分散注意。',
 '验收需包含：空标题不写入、重复完成返回可解释结果、不存在 ID 报错、Unicode 标题往返一致、损坏文件拒绝覆盖、旧数据有备份、删除后 ID 不复用、命令行错误退出码非零。',
 [['持久化读取损坏时应该？',['当成空数据并覆盖','报告错误且保留原文件','随机忽略几行'],1,'恢复策略必须保护原始数据。'],['删除最高 ID 后，新任务 ID 应由什么决定？',['持久化 next_id','当前任务数加一','始终使用 1'],0,'单调 next_id 避免重复使用已删除 ID。']],
 'https://doc.rust-lang.org/book/ch12-00-an-io-project.html');
add('30',5,'生态地图与结业复盘','把核心掌握程度和方向性扩展分开。',[
 ['先确认你的核心能力','能在没有提示的情况下解释 move 与 borrow；能选择 &str、String、Cow；能设计 Result 错误通路；能用 trait 与生命周期表达 API；能写确定性测试；能识别线程和 async 的区别；能阅读编译器诊断并通过结构调整解决问题。只记得关键字不足以构成交付能力。'],
 ['按目标选择生态','CLI 方向可以进一步学习 clap、serde、tracing；Web 服务可学习 Tokio、Axum、数据库访问和优雅退出；CPU 密集数据处理可学习 Rayon；嵌入式和系统方向需要进一步学习 no_std、alloc、中断与 FFI。这些是学习方向示例，不表示课程涵盖每个库的全部 API；依赖版本以各项目官方文档和你的锁文件为准。'],
 ['async 实战补充','下载包的 tokio-lab 提供实际运行时示例：并发执行、超时、任务句柄、有界通道和测试。它需要第三方依赖，第一次无缓存时需要网络下载。掌握后可以把综合项目拆成后台服务，但应先增加任务取消、锁范围、输入限额和持久化一致性设计。'],
 ['刻意练习的最后一轮','把 capstone 的文本格式改为版本化 JSON 是序列化练习；把查询返回 Vec<&Task> 是生命周期练习；加入可替换存储 trait 是抽象练习；加入工作线程是 Send/Sync 练习。每次只改变一个设计维度，保留现有验收测试，并新增能暴露这次风险的测试。'],
 ['如何判断可以结业','完成 30 章，不看答案重做 12 个测试驱动练习，测验正确率达到自己设定的阈值，再从零实现综合项目。最后用 5 分钟向别人解释最难的一次借用错误如何解决。之后每周重做一个小变更，保持对编译器反馈的熟悉度。']
],`fn main() {
    let checklist = ["ownership", "errors", "tests", "concurrency", "delivery"];
    for (index, item) in checklist.iter().enumerate() {
        println!("{}. {item}", index + 1);
    }
}`, '1. ownership\n2. errors\n3. tests\n4. concurrency\n5. delivery',
 '“完整复习核心语言与工程链路”不等于涵盖所有生态库、所有 unsafe 证明或所有平台细节。进一步学习应围绕实际目标。',
 '写一篇 300 字复盘，解释你在所有权、错误处理、异步三个领域各修正了什么误解，并列出下一周一个可验收任务。',
 '用自己的失败案例解释，尽量不用只重复教材定义的句子。',
 '合格复盘包含具体代码变化、原先错误的心智模型、测试证据和剩余疑问。例如把返回临时借用改为返回 String，并说明为何生命周期标注无法修复原实现。',
 [['下列哪个更能证明恢复 Rust 能力？',['记住所有关键字','独立实现并测试一次需求变更','只读答案'],1,'组合能力和反馈修正比被动熟悉更可靠。'],['下一步学习第三方库时应？',['核对官方文档与项目版本','假定所有示例永久不变','只看 crate 名'],0,'版本、特性和运行时假设都会影响示例是否适用。']],
 'https://tokio.rs/tokio/tutorial');

export const exercises = [
 ['ex01','checked_byte','02','范围转换','u16 → Option<u8>，拒绝超出 255 的值'],
 ['ex02','clamp_negatives','05','原地修改','借用切片，把负数归零，不新增分配'],
 ['ex03','first_word','06','字符串切片','借用首个单词，正确处理空白与 Unicode'],
 ['ex04','parse_numbers','09','错误传播','严格解析 CSV 整数，任一错误整体失败'],
 ['ex05','word_counts','10','集合聚合','按空白分词并转小写，返回有序词频'],
 ['ex06','even_square_sum','11','迭代器','偶数平方和，先转 i64 再平方'],
 ['ex07','counter','12','有状态闭包','返回每次递增的 FnMut 闭包'],
 ['ex08','generic_max','13','泛型借用','最大元素的借用，无 Clone 约束'],
 ['ex09','longer','15','生命周期','按字节长度选择更长的输入切片'],
 ['ex10','parallel_sum','19','作用域线程','两线程并行借用切片求和'],
 ['ex11','normalize','25','Cow','只在确实需要替换下划线时分配'],
 ['ex12','escape / unescape','27','严格文本协议','转义往返与非法输入检测'],
];
export const plan = [
 ['第 1 天','01—03','跑通工具链；恢复类型、函数、控制流'],
 ['第 2 天','04—05','画所有权流向；手写借用案例'],
 ['第 3 天','06—08','完成文本与数据建模；练习 01—03'],
 ['第 4 天','09—10','错误传播与集合；练习 04—05'],
 ['第 5 天','11—12','迭代器与闭包；练习 06—07'],
 ['第 6 天','13—15','泛型、trait、生命周期；练习 08—09'],
 ['第 7 天','16—17','模块与测试；回做第一周错题'],
 ['第 8 天','18—20','智能指针、线程与同步；练习 10'],
 ['第 9 天','21—22','Future、Pin；运行 Tokio 练习'],
 ['第 10 天','23—24','宏与 unsafe；把裸指针示例改回 safe'],
 ['第 11 天','25—28','API、Cargo、I/O、性能；练习 11—12'],
 ['第 12 天','29 · M1—M3','综合项目：模型、业务、格式'],
 ['第 13 天','29 · M4—M6','综合项目：持久化、CLI、验收'],
 ['第 14 天','30 · 复盘','重做错题；从空文件实现一个新需求'],
];
import { deepen } from './deep-dives.mjs';
deepen(lessons);
export { projectGuide } from './deep-dives.mjs';
