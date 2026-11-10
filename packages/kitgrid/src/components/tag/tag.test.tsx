import { render, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { useState } from "react"
import { Tag } from "./tag.js"

const Filters = () => {
  const [tags, setTags] = useState(["Linen", "Cotton"])
  return (
    <div>
      {tags.map((tag) => (
        <Tag
          key={tag}
          onRemove={() => setTags((current) => current.filter((t) => t !== tag))}
        >
          {tag}
        </Tag>
      ))}
    </div>
  )
}

describe("Tag", () => {
  it("has no button unless it is removable", () => {
    render(<Tag tone="accent">Summer</Tag>)
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("labels the remove button after the tag text and removes on click", async () => {
    render(<Filters />)
    await userEvent.click(screen.getByRole("button", { name: "Remove Linen" }))
    await waitFor(() => expect(screen.queryByText("Linen")).toBeNull())
    expect(screen.getByText("Cotton")).toBeInTheDocument()
  })

  it("waits for the exit animation and calls onRemove once despite repeat clicks", async () => {
    const onRemove = jest.fn()
    const { container } = render(
      <Tag onRemove={onRemove} removeLabel="Remove size filter">
        <strong>M</strong>
      </Tag>,
    )
    const tag = container.firstElementChild as HTMLElement
    let settle = () => {}
    const finished = new Promise<void>((resolve) => {
      settle = resolve
    })
    Object.defineProperty(tag, "getAnimations", {
      value: () => [{ finished } as unknown as Animation],
    })

    const button = screen.getByRole("button", { name: "Remove size filter" })
    await userEvent.click(button)
    await userEvent.click(button)
    expect(tag).toHaveAttribute("data-state", "closed")
    expect(onRemove).not.toHaveBeenCalled()

    settle()
    await waitFor(() => expect(onRemove).toHaveBeenCalledTimes(1))
    // The parent kept the tag mounted, so it comes back.
    await waitFor(() => expect(tag).not.toHaveAttribute("data-state"))
  })

  it("supports keyboard activation", async () => {
    const onRemove = jest.fn()
    render(
      <Tag onRemove={onRemove} animateExit={false}>
        Blue
      </Tag>,
    )
    screen.getByRole("button", { name: "Remove Blue" }).focus()
    await userEvent.keyboard("{Enter}")
    expect(onRemove).toHaveBeenCalledTimes(1)
  })
})
