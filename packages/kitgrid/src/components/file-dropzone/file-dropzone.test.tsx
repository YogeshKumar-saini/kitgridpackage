import { fireEvent, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { FileDropzone, formatBytes } from "./file-dropzone.js"
import { matchesAccept } from "./file-dropzone.js"

const file = (name: string, type: string, size = 1000) => {
  const f = new File(["x"], name, { type })
  Object.defineProperty(f, "size", { value: size })
  return f
}

const fileInput = () => document.querySelector<HTMLInputElement>('input[type="file"]') as HTMLInputElement

describe("helpers", () => {
  it("formats bytes and matches accept rules", () => {
    expect(formatBytes(512)).toBe("512 B")
    expect(formatBytes(2_500_000)).toBe("2.4 MB")
    expect(matchesAccept({ name: "a.PNG", type: "image/png" }, "image/*")).toBe(true)
    expect(matchesAccept({ name: "a.pdf", type: "application/pdf" }, ".pdf")).toBe(true)
    expect(matchesAccept({ name: "a.txt", type: "text/plain" }, "image/*,.pdf")).toBe(false)
  })
})

describe("FileDropzone", () => {
  it("is one button that opens the file dialog", async () => {
    render(<FileDropzone labels={{ hint: "PDF up to 2 MB" }} />)
    const button = screen.getByRole("button", { name: "Drop files or browse" })
    expect(button).toHaveAccessibleDescription("PDF up to 2 MB")
    const click = jest.spyOn(fileInput(), "click")
    await userEvent.click(button)
    expect(click).toHaveBeenCalled()
  })

  it("lists accepted files and reports rejections", async () => {
    const onFilesAccepted = jest.fn()
    const onFilesRejected = jest.fn()
    render(
      <FileDropzone
        accept="image/*"
        maxSize={5000}
        onFilesAccepted={onFilesAccepted}
        onFilesRejected={onFilesRejected}
      />,
    )
    const good = file("cover.png", "image/png")
    const big = file("poster.png", "image/png", 9000)
    const wrong = file("notes.txt", "text/plain")
    await userEvent.upload(fileInput(), [good, big, wrong], { applyAccept: false })
    expect(onFilesAccepted).toHaveBeenCalledWith([good])
    expect(onFilesRejected).toHaveBeenCalledWith([
      { file: big, reason: "size" },
      { file: wrong, reason: "type" },
    ])
    expect(screen.getByText("cover.png")).toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent("poster.png: File too large")
  })

  it("accepts dropped files", () => {
    const onFilesAccepted = jest.fn()
    render(<FileDropzone onFilesAccepted={onFilesAccepted} />)
    const target = screen.getByRole("button").parentElement as HTMLElement
    const dropped = file("a.pdf", "application/pdf")
    fireEvent.drop(target, { dataTransfer: { files: [dropped], types: ["Files"] } })
    expect(onFilesAccepted).toHaveBeenCalledWith([dropped])
  })

  it("shows controlled progress and removes rows", async () => {
    const onRemove = jest.fn()
    render(
      <FileDropzone
        items={[{ id: "1", name: "invoice.pdf", size: 120_000, status: "uploading", progress: 42 }]}
        onRemove={onRemove}
      />,
    )
    expect(screen.getByRole("progressbar", { name: "invoice.pdf upload" })).toHaveAttribute(
      "aria-valuenow",
      "42",
    )
    await userEvent.click(screen.getByRole("button", { name: "Remove invoice.pdf" }))
    expect(onRemove).toHaveBeenCalledWith("1")
  })
})
