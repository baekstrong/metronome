import SwiftUI

struct ContentView: View {
    @StateObject private var viewModel = MetronomeViewModel()

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.12, green: 0.16, blue: 0.23), Color(red: 0.91, green: 0.53, blue: 0.28)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(alignment: .leading, spacing: 24) {
                Text("Interval Metronome")
                    .font(.system(size: 34, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)

                Text("BPM 대신 초 단위로 반복음을 재생합니다.")
                    .font(.system(size: 15, weight: .medium, design: .rounded))
                    .foregroundStyle(.white.opacity(0.82))

                VStack(spacing: 18) {
                    HStack(alignment: .lastTextBaseline) {
                        Text(viewModel.intervalLabel)
                            .font(.system(size: 60, weight: .heavy, design: .rounded))
                            .monospacedDigit()
                        Text("sec")
                            .font(.system(size: 20, weight: .semibold, design: .rounded))
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)

                    Slider(
                        value: Binding(
                            get: { viewModel.intervalSeconds },
                            set: { viewModel.applyInterval($0) }
                        ),
                        in: 0.5...30,
                        step: 0.5
                    )
                    .tint(Color(red: 0.93, green: 0.37, blue: 0.21))

                    HStack {
                        Text("0.5s")
                        Spacer()
                        Text("30s")
                    }
                    .font(.system(size: 12, weight: .semibold, design: .rounded))
                    .foregroundStyle(.secondary)
                }
                .padding(24)
                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 28, style: .continuous))

                HStack(spacing: 16) {
                    statCard(title: "Next Tick", value: viewModel.countdownLabel, suffix: "sec")
                    statCard(title: "Played", value: "\(viewModel.tickCount)", suffix: "times")
                }

                HStack(spacing: 12) {
                    Button(action: viewModel.togglePlayback) {
                        Label(viewModel.isRunning ? "Stop" : "Start", systemImage: viewModel.isRunning ? "stop.fill" : "play.fill")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                    .tint(Color(red: 0.12, green: 0.16, blue: 0.23))

                    Button(action: viewModel.playPreview) {
                        Label("Preview", systemImage: "speaker.wave.2.fill")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                    .controlSize(.large)
                }
            }
            .padding(28)
            .frame(width: 460)
        }
    }

    private func statCard(title: String, value: String, suffix: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title.uppercased())
                .font(.system(size: 11, weight: .bold, design: .rounded))
                .tracking(1.2)
                .foregroundStyle(.secondary)
            HStack(alignment: .lastTextBaseline, spacing: 6) {
                Text(value)
                    .font(.system(size: 30, weight: .bold, design: .rounded))
                    .monospacedDigit()
                Text(suffix)
                    .font(.system(size: 13, weight: .semibold, design: .rounded))
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(20)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 24, style: .continuous))
    }
}
