import { render } from "@testing-library/react"
import { describeBackdrop } from "../../../test/backdrop-kit.js"
import { Waves } from "./waves.js"

describeBackdrop("Waves", Waves, "kg-waves", "waves")

describe("Waves", () => {
  it("renders one band per clamped layer and maps color", () => {
    const { container } = render(<Waves layers={9} color="red" speed={0} />)
    const root = container.firstElementChild as HTMLElement
    expect(container.querySelectorAll(".kg-waves__band")).toHaveLength(6)
    expect(root.style.getPropertyValue("--kg-waves-color")).toBe("red")
    expect(root.style.getPropertyValue("--kg-waves-state")).toBe("paused")
  })
})
