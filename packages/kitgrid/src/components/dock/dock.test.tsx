import { fireEvent, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { KitgridProvider } from "../../provider/kitgrid-provider.js"
import { Dock, DockItem, DockSeparator } from "./dock.js"
import { stubGlobal, unstubAllGlobals } from "../../../test/globals.js"

beforeEach(() => {
  stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    setTimeout(() => callback(performance.now()), 16),
  )
  stubGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id))
})

afterEach(() => unstubAllGlobals())

const frames = (ms = 80) => new Promise((resolve) => setTimeout(resolve, ms))

const renderDock = (props = {}) =>
  render(
    <Dock label="Apps" {...props}>
      <DockItem label="Finder" icon={<svg />} active />
      <DockItem label="Mail" icon={<svg />} />
      <DockSeparator />
      <DockItem label="Docs" asChild>
        <a href="#docs">D</a>
      </DockItem>
    </Dock>,
  )

describe("Dock", () => {
  it("is a named toolbar whose items are named by their labels", () => {
    renderDock()
    const toolbar = screen.getByRole("toolbar", { name: "Apps" })
    expect(toolbar).toHaveAttribute("aria-orientation", "horizontal")
    const finder = screen.getByRole("button", { name: "Finder" })
    expect(finder).toHaveAttribute("aria-current", "true")
    expect(screen.getByRole("link", { name: "Docs" })).toHaveAttribute("href", "#docs")
    expect(screen.getByRole("separator")).toHaveAttribute(
      "aria-orientation",
      "vertical",
    )
  })

  it("is a single tab stop with arrow-key, Home and End navigation", async () => {
    renderDock()
    const finder = screen.getByRole("button", { name: "Finder" })
    const mail = screen.getByRole("button", { name: "Mail" })
    const docs = screen.getByRole("link", { name: "Docs" })
    expect(finder).toHaveAttribute("tabindex", "0")
    expect(mail).toHaveAttribute("tabindex", "-1")

    await userEvent.tab()
    expect(finder).toHaveFocus()
    await userEvent.keyboard("{ArrowRight}")
    expect(mail).toHaveFocus()
    expect(mail).toHaveAttribute("tabindex", "0")
    expect(finder).toHaveAttribute("tabindex", "-1")
    await userEvent.keyboard("{End}")
    expect(docs).toHaveFocus()
    await userEvent.keyboard("{Home}")
    expect(finder).toHaveFocus()
  })

  it("fires item clicks", async () => {
    const onClick = jest.fn()
    render(
      <Dock label="Apps">
        <DockItem label="Music" onClick={onClick} />
      </Dock>,
    )
    await userEvent.click(screen.getByRole("button", { name: "Music" }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("magnifies items near a mouse pointer through CSS variables", async () => {
    renderDock()
    const toolbar = screen.getByRole("toolbar")
    expect(toolbar).toHaveAttribute("data-magnify")
    fireEvent.pointerEnter(toolbar, { pointerType: "mouse" })
    fireEvent.pointerMove(toolbar, { pointerType: "mouse", clientX: 0, clientY: 0 })
    await frames()
    const item = screen.getByRole("button", { name: "Finder" })
      .parentElement as HTMLElement
    expect(Number(item.style.getPropertyValue("--_s"))).toBeGreaterThan(1)
  })

  it("does not magnify under reduced motion", async () => {
    render(
      <KitgridProvider reducedMotion="always">
        <Dock label="Apps">
          <DockItem label="Mail" />
        </Dock>
      </KitgridProvider>,
    )
    const toolbar = screen.getByRole("toolbar")
    expect(toolbar).not.toHaveAttribute("data-magnify")
    fireEvent.pointerMove(toolbar, { pointerType: "mouse", clientX: 0, clientY: 0 })
    await frames()
    const item = screen.getByRole("button").parentElement as HTMLElement
    expect(item.style.getPropertyValue("--_s")).toBe("")
  })
})
