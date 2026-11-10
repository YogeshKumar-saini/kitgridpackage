import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  type AccordionProps,
} from "./accordion.js"

const Faq = (props: AccordionProps) => (
  <Accordion {...props}>
    <AccordionItem value="shipping">
      <AccordionTrigger>Shipping</AccordionTrigger>
      <AccordionContent>
        Ships in 2 days. <input aria-label="Postcode" />
      </AccordionContent>
    </AccordionItem>
    <AccordionItem value="returns" disabled>
      <AccordionTrigger>Returns</AccordionTrigger>
      <AccordionContent>30 days.</AccordionContent>
    </AccordionItem>
    <AccordionItem value="sizing">
      <AccordionTrigger level={4}>Sizing</AccordionTrigger>
      <AccordionContent>True to size.</AccordionContent>
    </AccordionItem>
  </Accordion>
)

const trigger = (name: string) => screen.getByRole("button", { name })

describe("Accordion", () => {
  it("renders headings with expandable buttons wired to labelled regions", () => {
    render(<Faq defaultValue="shipping" />)
    expect(
      screen.getByRole("heading", { level: 3, name: "Shipping" }),
    ).toContainElement(trigger("Shipping"))
    expect(
      screen.getByRole("heading", { level: 4, name: "Sizing" }),
    ).toBeInTheDocument()
    const region = screen.getByRole("region", { name: "Shipping" })
    expect(trigger("Shipping")).toHaveAttribute("aria-expanded", "true")
    expect(trigger("Shipping")).toHaveAttribute("aria-controls", region.id)
    expect(region).toHaveAttribute("data-state", "open")
    expect(trigger("Sizing")).toHaveAttribute("aria-expanded", "false")
  })

  it("keeps one item open in single mode and locks it unless collapsible", async () => {
    const onValueChange = jest.fn()
    const { unmount } = render(
      <Faq defaultValue="shipping" onValueChange={onValueChange} />,
    )
    expect(trigger("Shipping")).toHaveAttribute("aria-disabled", "true")
    await userEvent.click(trigger("Shipping"))
    expect(trigger("Shipping")).toHaveAttribute("aria-expanded", "true")
    await userEvent.click(trigger("Sizing"))
    expect(onValueChange).toHaveBeenLastCalledWith("sizing")
    expect(trigger("Shipping")).toHaveAttribute("aria-expanded", "false")
    unmount()

    render(
      <Faq
        type="single"
        collapsible
        defaultValue="shipping"
        onValueChange={onValueChange}
      />,
    )
    await userEvent.click(trigger("Shipping"))
    expect(onValueChange).toHaveBeenLastCalledWith("")
    expect(trigger("Shipping")).toHaveAttribute("aria-expanded", "false")
  })

  it("opens several items in multiple mode", async () => {
    const onValueChange = jest.fn()
    render(
      <Faq type="multiple" defaultValue={["shipping"]} onValueChange={onValueChange} />,
    )
    await userEvent.click(trigger("Sizing"))
    expect(onValueChange).toHaveBeenLastCalledWith(["shipping", "sizing"])
    expect(trigger("Shipping")).toHaveAttribute("aria-expanded", "true")
    expect(trigger("Sizing")).toHaveAttribute("aria-expanded", "true")
  })

  it("moves between headers with arrows, Home and End, skipping disabled items", async () => {
    render(<Faq />)
    await userEvent.tab()
    expect(trigger("Shipping")).toHaveFocus()
    await userEvent.keyboard("{ArrowDown}")
    expect(trigger("Sizing")).toHaveFocus()
    await userEvent.keyboard("{ArrowDown}")
    expect(trigger("Shipping")).toHaveFocus()
    await userEvent.keyboard("{End}")
    expect(trigger("Sizing")).toHaveFocus()
    await userEvent.keyboard("{Home}")
    expect(trigger("Shipping")).toHaveFocus()
  })

  it("leaves arrow keys inside panels to the content", async () => {
    render(<Faq defaultValue="shipping" />)
    const input = screen.getByRole("textbox", { name: "Postcode" })
    await userEvent.click(input)
    await userEvent.keyboard("{ArrowDown}")
    expect(input).toHaveFocus()
  })

  it("can be controlled", async () => {
    const onValueChange = jest.fn()
    render(<Faq value="sizing" onValueChange={onValueChange} />)
    await userEvent.click(trigger("Shipping"))
    expect(onValueChange).toHaveBeenCalledWith("shipping")
    expect(trigger("Sizing")).toHaveAttribute("aria-expanded", "true")
  })
})
