import { fireEvent, render, screen } from "@testing-library/react"
import { Avatar } from "./avatar.js"
import { AvatarGroup } from "./avatar-group.js"
import { getInitials, hueFromString } from "./avatar-utils.js"

describe("Avatar", () => {
  it("shows initials until the image loads, then marks itself loaded", () => {
    const { container } = render(<Avatar name="Ada Lovelace" src="/ada.jpg" />)
    const avatar = screen.getByRole("img", { name: "Ada Lovelace" })
    expect(avatar).toHaveAttribute("data-state", "loading")
    expect(container.querySelector(".kg-avatar__fallback")).toHaveTextContent("AL")
    fireEvent.load(container.querySelector("img") as HTMLImageElement)
    expect(avatar).toHaveAttribute("data-state", "loaded")
  })

  it("drops the image and keeps the initials when it fails", () => {
    const { container } = render(<Avatar name="Grace Hopper" src="/broken.jpg" />)
    fireEvent.error(container.querySelector("img") as HTMLImageElement)
    expect(container.querySelector("img")).toBeNull()
    expect(screen.getByRole("img", { name: "Grace Hopper" })).toHaveAttribute(
      "data-state",
      "error",
    )
  })

  it("includes the status in the accessible name", () => {
    render(
      <Avatar name="Linus" status="busy" statusLabels={{ busy: "Do not disturb" }} />,
    )
    expect(
      screen.getByRole("img", { name: "Linus, Do not disturb" }),
    ).toBeInTheDocument()
  })

  it("is hidden from assistive technology when decorative", () => {
    const { container } = render(<Avatar name="Ada Lovelace" alt="" />)
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true")
    expect(screen.queryByRole("img")).toBeNull()
  })

  it("derives stable initials and hues", () => {
    expect(getInitials("  ada  king lovelace ")).toBe("AL")
    expect(getInitials("Plato")).toBe("P")
    expect(getInitials("")).toBe("")
    expect(hueFromString("Ada")).toBe(hueFromString("Ada"))
    expect(hueFromString("Ada")).not.toBe(hueFromString("Grace"))
  })
})

describe("AvatarGroup", () => {
  it("collapses avatars past max into a labelled +N chip and shares its size", () => {
    render(
      <AvatarGroup max={2} size="sm" aria-label="Reviewers">
        <Avatar name="Ada Lovelace" />
        <Avatar name="Grace Hopper" />
        <Avatar name="Alan Turing" />
        <Avatar name="Edsger Dijkstra" />
      </AvatarGroup>,
    )
    const group = screen.getByRole("group", { name: "Reviewers" })
    expect(screen.getByRole("img", { name: "Ada Lovelace" })).toHaveAttribute(
      "data-size",
      "sm",
    )
    expect(screen.queryByRole("img", { name: "Alan Turing" })).toBeNull()
    const overflow = screen.getByRole("img", { name: "2 more" })
    expect(overflow).toHaveTextContent("+2")
    expect(group.children).toHaveLength(3)
  })
})
