// swift-tools-version: 6.1

import PackageDescription

let package = Package(
    name: "IntervalMetronome",
    platforms: [
        .macOS(.v14)
    ],
    products: [
        .library(
            name: "MetronomeCore",
            targets: ["MetronomeCore"]
        ),
        .executable(
            name: "IntervalMetronomeApp",
            targets: ["IntervalMetronomeApp"]
        )
    ],
    targets: [
        .target(
            name: "MetronomeCore"
        ),
        .executableTarget(
            name: "IntervalMetronomeApp",
            dependencies: ["MetronomeCore"]
        ),
        .testTarget(
            name: "MetronomeCoreTests",
            dependencies: ["MetronomeCore"]
        )
    ]
)
