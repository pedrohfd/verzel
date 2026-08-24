"use client";

import { buttonVariants } from "@verzel/ui/components/button";
import { cn } from "@verzel/ui/lib/utils";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { type DayButton, DayPicker } from "react-day-picker";
import { ptBR } from "react-day-picker/locale";

function Calendar({
	className,
	classNames,
	showOutsideDays = true,
	locale = ptBR,
	...props
}: ComponentProps<typeof DayPicker>) {
	return (
		<DayPicker
			showOutsideDays={showOutsideDays}
			locale={locale}
			className={cn("p-1", className)}
			classNames={{
				months: "flex flex-col gap-4",
				month: "flex flex-col gap-3",
				month_caption: "flex items-center justify-center px-8 text-sm",
				caption_label: "font-medium",
				nav: "flex items-center justify-between absolute inset-x-0 top-0",
				button_previous: cn(
					buttonVariants({ variant: "ghost", size: "icon-sm" }),
					"p-0",
				),
				button_next: cn(
					buttonVariants({ variant: "ghost", size: "icon-sm" }),
					"p-0",
				),
				month_grid: "w-full border-collapse",
				weekdays: "flex",
				weekday:
					"w-8 text-center text-muted-foreground text-[0.7rem] font-normal",
				week: "flex w-full mt-1",
				day: "size-8 p-0 text-center text-sm",
				day_button: cn(
					buttonVariants({ variant: "ghost" }),
					"size-8 rounded-sm p-0 font-normal aria-selected:opacity-100",
				),
				outside: "text-muted-foreground opacity-50",
				disabled: "text-muted-foreground opacity-50",
				hidden: "invisible",
				...classNames,
			}}
			components={{
				Chevron: ({ orientation, ...chevronProps }) =>
					orientation === "left" ? (
						<ChevronLeftIcon className="size-4" {...chevronProps} />
					) : (
						<ChevronRightIcon className="size-4" {...chevronProps} />
					),
				DayButton: CalendarDayButton,
			}}
			{...props}
		/>
	);
}

function CalendarDayButton({
	className,
	day,
	modifiers,
	...props
}: ComponentProps<typeof DayButton>) {
	return (
		<button
			type="button"
			data-day={day.date.toLocaleDateString()}
			data-selected={modifiers.selected}
			className={cn(
				buttonVariants({ variant: "ghost" }),
				"size-8 rounded-sm p-0 font-normal aria-selected:opacity-100",
				modifiers.selected &&
					"bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
				modifiers.today &&
					!modifiers.selected &&
					"bg-accent text-accent-foreground",
				className,
			)}
			{...props}
		/>
	);
}

export { Calendar };
