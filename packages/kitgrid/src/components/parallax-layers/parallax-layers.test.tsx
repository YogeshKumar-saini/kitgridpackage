import { render, screen } from "@testing-library/react"
import { KitgridProvider } from "../../provider/kitgrid-provider.js"
import { ParallaxLayer, ParallaxLayers } from "./parallax-layers.js"

describe("ParallaxLayers", () => {
  it("renders layers with their depth in reading order", () => {
    render(
      <ParallaxLayers range={200}>
        <ParallaxLayer depth={-0.4}>Back</ParallaxLayer>
        <ParallaxLayer depth={0.8}>Front</ParallaxLayer>
      </ParallaxLayers>,
    )
    expect(screen.getByText("Back").style.getPropertyValue("--_depth")).toBe("-0.4")
    expect(screen.getByText("Front").parentElement?.style.getPropertyValue("--_range")).toBe(
      "200px",
    )
  })

  it("leaves layers at rest under reduced motion", () => {
    const { container } = render(
      <KitgridProvider reducedMotion="always">
        <ParallaxLayers pointer>
          <ParallaxLayer>Still</ParallaxLayer>
        </ParallaxLayers>
      </KitgridProvider>,
    )
    const scene = container.querySelector(".kg-parallax-layers") as HTMLElement
    expect(scene.style.getPropertyValue("--_scroll")).toBe("")
  })
})
