import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@verzel/ui/components/alert-dialog";
import { Button } from "@verzel/ui/components/button";
import axios from "axios";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { deleteRoom } from "@/api/requests/rooms/delete-room";
import { getMyRooms } from "@/api/requests/rooms/get-my-rooms";
import type { CinemaRoom } from "@/api/types";
import BackLink from "@/components/molecules/back-link";
import RoomForm from "@/components/organisms/room-form";
import Loader from "@/components/ui/loader";
import { requireRole } from "@/lib/route-guards";
import { tryCatch } from "@/lib/try-catch";

export const Route = createFileRoute("/organizer/rooms/$roomId/edit")({
	component: EditRoomComponent,
	beforeLoad: () => requireRole("organizador"),
});

function EditRoomComponent() {
	const { roomId } = Route.useParams();
	const navigate = useNavigate();

	const [room, setRoom] = useState<CinemaRoom | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [deleting, setDeleting] = useState(false);

	useEffect(() => {
		const controller = new AbortController();
		(async () => {
			const [rooms, fetchError] = await tryCatch(getMyRooms(controller.signal));
			if (fetchError) {
				setError("Não foi possível carregar a sala.");
				return;
			}
			const found = rooms.find((r) => r.id === roomId);
			if (!found) {
				setError("Sala não encontrada.");
				return;
			}
			setRoom(found);
		})();
		return () => controller.abort();
	}, [roomId]);

	if (error) {
		return (
			<div className="container mx-auto max-w-2xl px-4 py-6">
				<p className="text-destructive text-sm">{error}</p>
				<Link to="/organizer/rooms" className="mt-4 inline-block">
					<Button variant="outline">Voltar</Button>
				</Link>
			</div>
		);
	}

	if (!room) return <Loader />;

	async function handleDelete() {
		setDeleting(true);
		const [, deleteError] = await tryCatch(deleteRoom(roomId));
		setDeleting(false);

		if (deleteError) {
			const isRoomInUse =
				axios.isAxiosError(deleteError) &&
				deleteError.response?.data?.code === "ROOM_IN_USE";
			toast.error(
				isRoomInUse
					? "Esta sala está em uso por um evento ativo e não pode ser excluída."
					: "Não foi possível excluir a sala.",
			);
			return;
		}

		toast.success("Sala excluída.");
		navigate({ to: "/organizer/rooms" });
	}

	return (
		<div className="container mx-auto max-w-[1600px] px-4 py-6">
			<BackLink to="/organizer/rooms" label="Minhas salas" />
			<div className="mb-6 flex items-center justify-between">
				<h1 className="font-bold text-2xl">Editar sala</h1>
				<AlertDialog>
					<AlertDialogTrigger
						render={
							<Button variant="destructive" size="sm" disabled={deleting} />
						}
					>
						Excluir sala
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Excluir sala</AlertDialogTitle>
							<AlertDialogDescription>
								Tem certeza que deseja excluir a sala "{room.name}"? Essa ação
								não pode ser desfeita.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancelar</AlertDialogCancel>
							<AlertDialogAction variant="destructive" onClick={handleDelete}>
								Excluir
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</div>
			<RoomForm
				room={room}
				onSaved={() => navigate({ to: "/organizer/rooms" })}
			/>
		</div>
	);
}
