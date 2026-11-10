import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { ReviewForm } from "./review-form.js"

describe("ReviewForm", () => {
  it("requires a rating and enough text before submitting", async () => {
    const onSubmit = jest.fn()
    render(<ReviewForm onSubmit={onSubmit} />)
    await userEvent.click(screen.getByRole("button", { name: "Post review" }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText("Choose a star rating.")).toBeInTheDocument()
    expect(screen.getAllByRole("radio")[0]).toHaveFocus()
  })

  it("submits the trimmed review and confirms", async () => {
    const onSubmit = jest.fn(async () => {})
    render(<ReviewForm onSubmit={onSubmit} />)
    await userEvent.click(screen.getAllByRole("radio")[3] as HTMLElement)
    expect(screen.getByText("Great")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("textbox", { name: "Title" }))
    await userEvent.paste("Lovely fit")
    await userEvent.click(screen.getByRole("textbox", { name: /Your review/ }))
    await userEvent.paste("  Soft linen, true to size.  ")
    await userEvent.click(screen.getByRole("button", { name: "Post review" }))
    expect(onSubmit).toHaveBeenCalledWith({
      rating: 4,
      title: "Lovely fit",
      body: "Soft linen, true to size.",
    })
    expect(await screen.findByRole("status")).toHaveTextContent("Thanks, your review is posted.")
  }, 30000)
})
