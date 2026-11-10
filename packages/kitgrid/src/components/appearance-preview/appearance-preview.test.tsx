import { render, screen } from "@testing-library/react"
import { AppearancePreview } from "./appearance-preview.js"

describe("AppearancePreview", () => {
  it("is decorative by default", () => {
    const { container } = render(<AppearancePreview />)
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true")
    expect(screen.queryByRole("img")).toBeNull()
  })

  it("scopes the theme and token overrides to itself", () => {
    render(
      <AppearancePreview
        label="Dark theme with a teal accent"
        theme="dark"
        accent="oklch(0.7 0.12 190)"
        radius={4}
        density={0.9}
        font="Georgia, serif"
      />,
    )
    const preview = screen.getByRole("img", { name: "Dark theme with a teal accent" })
    expect(preview).toHaveAttribute("data-theme", "dark")
    expect(preview).toHaveAttribute("data-kg-scope")
    expect(preview.style.getPropertyValue("--kg-accent")).toBe("oklch(0.7 0.12 190)")
    expect(preview.style.getPropertyValue("--kg-radius")).toBe("4px")
    expect(preview.style.getPropertyValue("--kg-density")).toBe("0.9")
    expect(preview.style.fontFamily).toBe("Georgia, serif")
  })
})
