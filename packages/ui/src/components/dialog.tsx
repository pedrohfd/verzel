"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { cn } from "@verzel/ui/lib/utils";
import { XIcon } from "lucide-react";

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
	return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
	return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
	return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
	className,
	...props
}: DialogPrimitive.Backdrop.Props) {
	return (
		<DialogPrimitive.Backdrop
			data-slot="dialog-overlay"
			className={cn(
				"data-open:fade-in-0 data-closed:fade-out-0 fixed inset-0 z-50 bg-black/60 data-closed:animate-out data-open:animate-in",
				className,
			)}
			{...props}
		/>
	);
}

function DialogContent({
	className,
	children,
	showCloseButton = true,
	...props
}: DialogPrimitive.Popup.Props & { showCloseButton?: boolean }) {
	return (
		<DialogPrimitive.Portal>
			<DialogOverlay />
			<DialogPrimitive.Viewport className="fixed inset-0 z-50 flex items-center justify-center p-4">
				<DialogPrimitive.Popup
					data-slot="dialog-content"
					className={cn(
						"data-open:fade-in-0 data-open:zoom-in-95 data-closed:fade-out-0 data-closed:zoom-out-95 relative grid w-full max-w-lg gap-4 rounded-none border border-border bg-background p-6 shadow-lg outline-none data-closed:animate-out data-open:animate-in",
						className,
					)}
					{...props}
				>
					{children}
					{showCloseButton && (
						<DialogPrimitive.Close
							data-slot="dialog-close"
							className="absolute top-4 right-4 rounded-none opacity-70 outline-none transition-opacity hover:opacity-100 focus-visible:opacity-100 disabled:pointer-events-none"
						>
							<XIcon className="size-4" />
							<span className="sr-only">Fechar</span>
						</DialogPrimitive.Close>
					)}
				</DialogPrimitive.Popup>
			</DialogPrimitive.Viewport>
		</DialogPrimitive.Portal>
	);
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
	return (
		<DialogPrimitive.Title
			data-slot="dialog-title"
			className={cn("font-semibold text-lg leading-none", className)}
			{...props}
		/>
	);
}

function DialogDescription({
	className,
	...props
}: DialogPrimitive.Description.Props) {
	return (
		<DialogPrimitive.Description
			data-slot="dialog-description"
			className={cn("text-muted-foreground text-sm", className)}
			{...props}
		/>
	);
}

export {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogOverlay,
	DialogTitle,
	DialogTrigger,
};
