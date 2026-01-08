<a id="readme-top"></a>

[![Contributors][contributors-shield]][contributors-url] [![Issues][issues-shield]][issues-url] [![Forks][forks-shield]][forks-url] [![LinkedIn][linkedin-shield]][linkedin-url]
<!-- [![Stargazers][stars-shield]][stars-url] -->

<!-- PROJECT LOGO -->
<!-- <br /> -->
<div align="center">
  <!-- <a href="https://github.com/djones-dev/orbium">
    <img src="images/logo.png" alt="Logo" width="80" height="80">
  </a> -->

  <h3 align="center">Orbium</h3>

  <p align="center">
    A browser-based generative ambient synthesizer driven by orbital mechanics.
    <br />
    <!-- <a href="https://github.com/djones-dev/orbium"><strong>Explore the docs »</strong></a> -->
    <!-- <br /> -->
    <br />
    <!-- <a href="https://demo.orbium.app">View Demo</a> -->
    <a href="https://github.com/djones-dev/orbium/issues">Report Bug</a>
    &middot;
    <a href="https://github.com/djones-dev/orbium/issues">Request Feature</a>
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
  </ol>
</details>

## About The Project

Orbium is a generative ambient synthesizer that reimagines music composition through the lens of orbital mechanics. Instead of a traditional linear timeline, you place celestial bodies in orbit around a central sun. Each body produces sound, and its orbital path determines the rhythm and evolution of your composition.

Why circular time? Traditional DAWs are powerful but often feel rigid and intimidating for ambient music. Orbium offers a different mental model: one based on gravitational relationships and emergent complexity.

The interface combines two distinct worlds:
1.  **The Visualization**: An organic, shader-driven 3D view where planets breathe and pulse with their sonic characteristics.
2.  **The Terminal**: A retro, "muted technical" command center with box-drawing aesthetics and phosphor-glow text, giving you precise control over the chaos.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Built With

*   [![React][React.js]][React-url]
*   [![TypeScript][TypeScript]][TypeScript-url]
*   [![Vite][Vite]][Vite-url]
*   [![Three.js][Three.js]][Three-url] (React Three Fiber)
*   **Web Audio API** (Native)
*   **FastAPI** (Backend)
*   **PostgreSQL** (Database)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Getting Started

To get a local copy of Orbium running, follow these steps.

### Prerequisites

*   Node.js (v18+)
*   npm or yarn
*   Python 3.10+ (for backend services)
*   Docker & Docker Compose (optional, for full stack orchestration)

### Installation

1.  Clone the repo
    ```sh
    git clone https://github.com/djones-dev/orbium.git
    ```
2.  **Frontend Setup**
    ```sh
    cd frontend
    npm install
    npm run dev
    ```
3.  **Backend Setup** (Optional for UI-only testing)
    ```sh
    cd backend
    pip install -r requirements.txt
    uvicorn main:app --reload
    ```
4.  **Full Stack (Docker)**
    ```sh
    docker-compose up --build
    ```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Usage

Once opened, you are greeted by the central Sun, which generates a continuous harmonic drone.

*   **Add Planets**: Use the terminal controls to add planets (`+ PLANET`). Each planet represents a distinct voice in the mix.
*   **Shape the Sound**: Select a planet to adjust its parameters in the "Body Inspector".
    *   **Period**: Controls the rhythmic cycle (orbit speed).
    *   **Waveform**: Choose between Sine, Triangle, Sawtooth, or Square.
    *   **Filters**: Adjust cutoff and resonance to sculpt the timbre.
*   **Visual Feedback**: Watch as the planet shaders react in real-time. A "sawtooth" planet will look jagged and aggressive, while a "sine" planet appears smooth and liquid.

_More detailed documentation coming soon._

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Roadmap

- [x] **Core Architecture**
    - [x] Web Audio Engine Setup
    - [x] React Three Fiber Visualization foundation
    - [x] Main Simulation Loop
- [x] **Visual Overhaul (v4)**
    - [x] Terminal-style UI (Phosphor aesthetic, Box-drawing)
    - [x] Shader-driven Sun visualization (Organic noise, varying glow)
    - [ ] Audio-reactive uniforms for shaders
- [ ] **Celestial Bodies**
    - [ ] Planets (Basic waveforms)
    - [ ] Asteroid Fields (Granular synthesis w/ AudioWorklets)
    - [ ] Comets (Long-period accent events)
- [ ] **Interaction Engine**
    - [ ] Gravity-based modulation (planets affecting each other)
    - [ ] "Spawn" mode for interaction events
- [ ] **Persistence**
    - [ ] Save/Load Presets via API
    - [ ] User Accounts

See the [open issues](https://github.com/djones-dev/orbium/issues) for a full list of proposed features (and known issues).

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## License

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Contact

Project Link: [https://github.com/djones-dev/orbium](https://github.com/djones-dev/orbium)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

[contributors-shield]: https://img.shields.io/github/contributors/djones-dev/orbium.svg?style=for-the-badge
[contributors-url]: https://github.com/djones-dev/orbium/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/djones-dev/orbium.svg?style=for-the-badge
[forks-url]: https://github.com/djones-dev/orbium/network/members
[issues-shield]: https://img.shields.io/github/issues/djones-dev/orbium.svg?style=for-the-badge
[issues-url]: https://github.com/djones-dev/orbium/issues
[linkedin-shield]: https://img.shields.io/badge/-LinkedIn-black.svg?style=for-the-badge&logo=linkedin&colorB=555
[linkedin-url]: https://www.linkedin.com/in/daniel-jones-ba6325337
[React.js]: https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB
[React-url]: https://reactjs.org/
[Three.js]: https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=three.js&logoColor=white
[Three-url]: https://threejs.org/
[TypeScript]: https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white
[TypeScript-url]: https://www.typescriptlang.org/
[Vite]: https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white
[Vite-url]: https://vitejs.dev/
****
