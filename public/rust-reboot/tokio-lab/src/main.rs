use std::time::Duration;
use tokio::sync::mpsc;
use tokio::time::{sleep, timeout};

async fn delayed(value: u32, millis: u64) -> u32 {
    sleep(Duration::from_millis(millis)).await;
    value
}
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let (a, b) = tokio::join!(delayed(10, 20), delayed(20, 10));
    println!("并发等待结果：{}", a + b);
    let (tx, mut rx) = mpsc::channel(2); // 有界：接收慢时向发送方施加背压。
    let producer = tokio::spawn(async move {
        for value in 1..=3 {
            if tx.send(value).await.is_err() {
                break;
            }
        }
    });
    let mut sum = 0;
    while let Some(value) = rx.recv().await {
        sum += value;
    }
    producer.await?; // 显式观察任务 panic/取消。
    println!("通道求和：{sum}");
    // 超时丢弃被等待 Future，但不回滚已经发生的副作用。
    let result = timeout(Duration::from_millis(5), delayed(99, 100)).await;
    println!("超时：{}", result.is_err());
    Ok(())
}
#[cfg(test)]
mod tests {
    use super::*;
    #[tokio::test(start_paused = true)]
    async fn concurrent_results() {
        let (a, b) = tokio::join!(delayed(3, 20), delayed(4, 10));
        assert_eq!(a + b, 7);
    }
    #[tokio::test(start_paused = true)]
    async fn timeout_cancels_wait() {
        assert!(
            timeout(Duration::from_millis(1), delayed(9, 100))
                .await
                .is_err()
        );
    }
    #[tokio::test]
    async fn channel_closes_when_sender_drops() {
        let (tx, mut rx) = mpsc::channel(1);
        tx.send(7).await.unwrap();
        drop(tx);
        assert_eq!(rx.recv().await, Some(7));
        assert_eq!(rx.recv().await, None);
    }
}
