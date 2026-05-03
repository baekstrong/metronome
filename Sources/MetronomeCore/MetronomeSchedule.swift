import Foundation

public struct MetronomeSchedule: Sendable, Equatable {
    public let interval: Duration

    public init(seconds: Double) {
        self.interval = .milliseconds(Int64((seconds * 1_000).rounded()))
    }

    public init(interval: Duration) {
        self.interval = interval
    }

    public func firstTick(after start: ContinuousClock.Instant) -> ContinuousClock.Instant {
        start.advanced(by: interval)
    }

    public func tick(after previousTick: ContinuousClock.Instant) -> ContinuousClock.Instant {
        previousTick.advanced(by: interval)
    }

    public func remainingSeconds(until nextTick: ContinuousClock.Instant, now: ContinuousClock.Instant) -> Double {
        let remaining = now.duration(to: nextTick).secondsValue
        return max(0, remaining)
    }
}

public extension Duration {
    var secondsValue: Double {
        let components = self.components
        return Double(components.seconds) + (Double(components.attoseconds) / 1_000_000_000_000_000_000)
    }
}
