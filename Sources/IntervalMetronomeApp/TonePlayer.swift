import AVFoundation
import Foundation

final class TonePlayer {
    private let engine = AVAudioEngine()
    private let player = AVAudioPlayerNode()
    private let buffer: AVAudioPCMBuffer

    init() {
        let format = AVAudioFormat(standardFormatWithSampleRate: 44_100, channels: 1)!
        buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: 5_292)!
        buffer.frameLength = buffer.frameCapacity

        let frameCount = Int(buffer.frameLength)
        let sampleRate = format.sampleRate
        let frequency = 1_320.0

        let channels = buffer.floatChannelData!
        let left = channels[0]

        for frame in 0..<frameCount {
            let progress = Double(frame) / Double(frameCount)
            let envelope = max(0, 1.0 - progress)
            let sample = sin(2 * Double.pi * frequency * Double(frame) / sampleRate) * envelope * 0.28
            left[frame] = Float(sample)
        }

        engine.attach(player)
        engine.connect(player, to: engine.mainMixerNode, format: format)

        do {
            try engine.start()
        } catch {
            assertionFailure("Failed to start audio engine: \(error)")
        }
    }

    func playTick() {
        if engine.isRunning == false {
            try? engine.start()
        }

        player.stop()
        player.scheduleBuffer(buffer, at: nil, options: .interrupts)
        player.play()
    }
}
