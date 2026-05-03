import XCTest
@testable import MetronomeCore

final class MetronomeScheduleTests: XCTestCase {
    func testFirstTickMatchesConfiguredInterval() {
        let schedule = MetronomeSchedule(seconds: 2.5)
        let clock = ContinuousClock()
        let start = clock.now

        let firstTick = schedule.firstTick(after: start)
        let elapsed = start.duration(to: firstTick).secondsValue

        XCTAssertEqual(elapsed, 2.5, accuracy: 0.001)
    }

    func testTickAdvancesBySameIntervalEachTime() {
        let schedule = MetronomeSchedule(seconds: 3)
        let clock = ContinuousClock()
        let start = clock.now

        let first = schedule.firstTick(after: start)
        let second = schedule.tick(after: first)
        let third = schedule.tick(after: second)

        XCTAssertEqual(start.duration(to: first).secondsValue, 3, accuracy: 0.001)
        XCTAssertEqual(first.duration(to: second).secondsValue, 3, accuracy: 0.001)
        XCTAssertEqual(second.duration(to: third).secondsValue, 3, accuracy: 0.001)
    }

    func testRemainingSecondsNeverDropsBelowZero() {
        let schedule = MetronomeSchedule(seconds: 1)
        let clock = ContinuousClock()
        let start = clock.now
        let nextTick = schedule.firstTick(after: start)
        let lateMoment = schedule.tick(after: nextTick)

        XCTAssertEqual(schedule.remainingSeconds(until: nextTick, now: lateMoment), 0)
    }
}
