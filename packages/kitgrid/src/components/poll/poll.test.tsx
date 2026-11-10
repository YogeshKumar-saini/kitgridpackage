import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Poll, type PollOption } from "./poll.js"

const options: PollOption[] = [
  { id: "weekly", label: "Weekly", votes: 5 },
  { id: "daily", label: "Daily", votes: 2 },
]

describe("Poll", () => {
  it("votes with radios, then shows results with your choice counted", async () => {
    const user = userEvent.setup()
    const onVote = jest.fn()
    render(<Poll question="How often do you export?" options={options} onVote={onVote} />)
    expect(screen.getByRole("region", { name: "How often do you export?" })).toBeInTheDocument()
    const vote = screen.getByRole("button", { name: "Vote" })
    expect(vote).toBeDisabled()
    await user.click(screen.getByRole("radio", { name: "Daily" }))
    await user.click(vote)
    expect(onVote).toHaveBeenCalledWith("daily")
    expect(screen.queryByRole("radio")).toBeNull()
    expect(screen.getByRole("status")).toHaveTextContent("8 votes")
    expect(screen.getByText("38%")).toBeInTheDocument()
    expect(screen.getByText("Your vote")).toBeInTheDocument()
  })

  it("shows results straight away when closed", () => {
    render(<Poll question="Q" options={options} closed />)
    expect(screen.getByText("71%")).toBeInTheDocument()
    expect(screen.queryByRole("button")).toBeNull()
  })
})
