import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { AvatarUpload } from "./avatar-upload.js"

beforeAll(() => {
  URL.createObjectURL = () => "blob:preview"
  URL.revokeObjectURL = () => {}
})

const input = () => document.querySelector<HTMLInputElement>('input[type="file"]') as HTMLInputElement

describe("AvatarUpload", () => {
  it("shows the fallback and a labelled change button", () => {
    render(<AvatarUpload fallback="AR" />)
    expect(screen.getByRole("button", { name: "Change photo" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Remove photo" })).not.toBeInTheDocument()
  })

  it("shows a neutral placeholder when there is no photo or fallback", () => {
    const { container } = render(<AvatarUpload />)
    expect(container.querySelector(".kg-avatar-upload__placeholder")).toBeInTheDocument()
    expect(container.querySelector("img")).toBeNull()
  })

  it("previews a chosen file and reports it", async () => {
    const onFileChange = jest.fn()
    render(<AvatarUpload onFileChange={onFileChange} />)
    const photo = new File(["x"], "me.png", { type: "image/png" })
    await userEvent.upload(input(), photo)
    expect(onFileChange).toHaveBeenCalledWith(photo)
    expect(document.querySelector("img")).toHaveAttribute("src", "blob:preview")
  })

  it("removes the photo", async () => {
    const onFileChange = jest.fn()
    render(<AvatarUpload src="/me.jpg" fallback="AR" onFileChange={onFileChange} />)
    await userEvent.click(screen.getByRole("button", { name: "Remove photo" }))
    expect(onFileChange).toHaveBeenCalledWith(null)
    expect(document.querySelector("img")).toBeNull()
  })
})
