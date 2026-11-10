import { act, render, screen } from "@testing-library/react"
import { hydrateRoot } from "react-dom/client"
import { renderToString } from "react-dom/server"
import { Kbd } from "./kbd.js"

const mockPlatform = (platform: string) =>
  jest.spyOn(navigator, "platform", "get").mockReturnValue(platform)

afterEach(() => {
  jest.restoreAllMocks()
})

describe("Kbd", () => {
  it("nests one <kbd> per key with readable names for glyphs", () => {
    mockPlatform("Win32")
    const { container } = render(<Kbd keys={["mod", "shift", "k"]} />)
    const keys = container.querySelectorAll(".kg-kbd__key")
    expect(keys).toHaveLength(3)
    expect(keys[0]).toHaveTextContent("Ctrl")
    expect(keys[1]).toHaveTextContent("⇧Shift")
    expect(keys[2]).toHaveTextContent("K")
    expect(container.querySelectorAll(".kg-kbd__separator")).toHaveLength(2)
  })

  it("renders ⌘ on Apple platforms and drops separators when asked", () => {
    mockPlatform("MacIntel")
    const { container } = render(<Kbd keys={["mod", "k"]} separator={null} />)
    expect(container.querySelector(".kg-kbd__key")).toHaveTextContent("⌘Command")
    expect(container.querySelector(".kg-kbd__separator")).toBeNull()
  })

  it("renders Ctrl on the server and upgrades to ⌘ after hydration without errors", async () => {
    const html = renderToString(<Kbd keys={["mod", "k"]} />)
    expect(html).toContain("Ctrl")

    mockPlatform("MacIntel")
    const errors = jest.spyOn(console, "error").mockImplementation(() => {})
    const host = document.createElement("div")
    host.innerHTML = html
    document.body.append(host)
    await act(async () => {
      hydrateRoot(host, <Kbd keys={["mod", "k"]} />)
    })
    expect(host.querySelector(".kg-kbd__key")).toHaveTextContent("⌘Command")
    expect(errors).not.toHaveBeenCalled()
    host.remove()
  })

  it("renders plain children as a single key", () => {
    render(<Kbd size="sm">Esc</Kbd>)
    expect(screen.getByText("Esc").tagName).toBe("KBD")
  })
})
