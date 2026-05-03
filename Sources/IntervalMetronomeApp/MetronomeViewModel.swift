import Foundation
import MetronomeCore
import SwiftUI

@MainActor
final class MetronomeViewModel: ObservableObject {
    private enum StorageKey {
        static let intervalSeconds = "intervalSeconds"
    }

    @Published var intervalSeconds: Double
    @Published private(set) var isRunning = false
    @Published private(set) var secondsUntilNextTick: Double
    @Published private(set) var tickCount = 0

    private let clock = ContinuousClock()
    private let tonePlayer = TonePlayer()
    private var nextTick: ContinuousClock.Instant?
    private var metronomeTask: Task<Void, Never>?
    private var countdownTask: Task<Void, Never>?

    init() {
        let storedInterval = UserDefaults.standard.object(forKey: StorageKey.intervalSeconds) as? Double ?? 5.0
        intervalSeconds = storedInterval
        secondsUntilNextTick = storedInterval
    }

    var intervalLabel: String {
        intervalSeconds.formatted(.number.precision(.fractionLength(intervalSeconds < 10 ? 1 : 0)))
    }

    var countdownLabel: String {
        secondsUntilNextTick.formatted(.number.precision(.fractionLength(1)))
    }

    func applyInterval(_ newValue: Double) {
        intervalSeconds = newValue
        UserDefaults.standard.set(newValue, forKey: StorageKey.intervalSeconds)

        if !isRunning {
            secondsUntilNextTick = newValue
        }
    }

    func togglePlayback() {
        isRunning ? stop() : start()
    }

    func playPreview() {
        tonePlayer.playTick()
    }

    func stop() {
        isRunning = false
        nextTick = nil
        secondsUntilNextTick = intervalSeconds
        metronomeTask?.cancel()
        countdownTask?.cancel()
        metronomeTask = nil
        countdownTask = nil
    }

    private func start() {
        stop()
        isRunning = true

        let schedule = MetronomeSchedule(seconds: intervalSeconds)
        let firstTick = schedule.firstTick(after: clock.now)
        let clock = self.clock
        nextTick = firstTick
        secondsUntilNextTick = intervalSeconds

        countdownTask = Task { [weak self] in
            guard let self else { return }

            while !Task.isCancelled {
                let deadline = await MainActor.run { self.nextTick }
                guard let deadline else { break }

                let remaining = schedule.remainingSeconds(until: deadline, now: clock.now)
                await MainActor.run { self.secondsUntilNextTick = remaining }

                try? await Task.sleep(for: .milliseconds(50))
            }
        }

        metronomeTask = Task { [weak self] in
            guard let self else { return }
            var scheduledTick = firstTick

            while !Task.isCancelled {
                do {
                    try await clock.sleep(until: scheduledTick, tolerance: .milliseconds(15))
                } catch {
                    break
                }

                await MainActor.run {
                    self.tonePlayer.playTick()
                    self.tickCount += 1
                }

                scheduledTick = schedule.tick(after: scheduledTick)
                await MainActor.run {
                    self.nextTick = scheduledTick
                    self.secondsUntilNextTick = self.intervalSeconds
                }
            }
        }
    }
}
