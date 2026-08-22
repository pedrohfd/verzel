import { createFileRoute, Link } from "@tanstack/react-router";
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@verzel/ui/components/table";
import axios from "axios";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { deleteRoom } from "@/api/requests/rooms/delete-room";
import { getMyRooms } from "@/api/requests/rooms/get-my-rooms";
import type { CinemaRoom } from "@/api/types";
import Loader from "@/components/ui/loader";
import { requireRole } from "@/lib/route-guards";
import { tryCatch } from "@/lib/try-catch";

export const Route = createFileRoute("/organizer/rooms/")({
	component: RoomsListComponent,
	beforeLoad: () => requireRole("organizador"),
});

function RoomsListComponent() {
	const [rooms, setRooms] = useState<CinemaRoom[] | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [pendingId, setPendingId] = useState<string | null>(null);

	useEffect(() => {
		const controller = new AbortController();
		(async () => {
			const [response, fetchError] = await tryCatch(
				getMyRooms(controller.signal),
			);
			if (fetchError) {
				setError("Não foi possível carregar suas salas.");
				return;
			}
			setRooms(response);
		})();
		return () => controller.abort();
	}, []);

	async function handleDelete(roomId: string) {
		setPendingId(roomId);
		const [, deleteError] = await tryCatch(deleteRoom(roomId));
		setPendingId(null);

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

		setRooms(
			(current) => current?.filter((room) => room.id !== roomId) ?? null,
		);
		toast.success("Sala excluída.");
	}

	if (error) {
		return (
			<div className="container mx-auto max-w-4xl px-4 py-6">
				<p className="text-destructive text-sm">{error}</p>
			</div>
		);
	}

	if (!rooms) return <Loader />;

	return (
		<div className="container mx-auto max-w-4xl px-4 py-6">
			<div className="mb-6 flex items-center justify-between">
				<h1 className="font-bold text-2xl">Minhas Salas</h1>
				<Link to="/organizer/rooms/new">
					<Button>Criar nova sala</Button>
				</Link>
			</div>

			{rooms.length === 0 ? (
				<p className="text-muted-foreground text-sm">
					Você ainda não criou nenhuma sala.
				</p>
			) : (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Nome</TableHead>
							<TableHead>Fileiras</TableHead>
							<TableHead>Assentos por fileira</TableHead>
							<TableHead>Capacidade</TableHead>
							<TableHead />
						</TableRow>
					</TableHeader>
					<TableBody>
						{rooms.map((room) => (
							<TableRow key={room.id}>
								<TableCell>{room.name}</TableCell>
								<TableCell>{room.rows}</TableCell>
								<TableCell>{room.columns}</TableCell>
								<TableCell>{room.rows * room.columns}</TableCell>
								<TableCell className="flex justify-end gap-2 text-right">
									<Link
										to="/organizer/rooms/$roomId/edit"
										params={{ roomId: room.id }}
									>
										<Button variant="outline" size="sm">
											Editar
										</Button>
									</Link>
									<AlertDialog>
										<AlertDialogTrigger
											render={
												<Button
													variant="destructive"
													size="sm"
													disabled={pendingId === room.id}
												/>
											}
										>
											Excluir
										</AlertDialogTrigger>
										<AlertDialogContent>
											<AlertDialogHeader>
												<AlertDialogTitle>Excluir sala</AlertDialogTitle>
												<AlertDialogDescription>
													Tem certeza que deseja excluir a sala "{room.name}"?
													Essa ação não pode ser desfeita.
												</AlertDialogDescription>
											</AlertDialogHeader>
											<AlertDialogFooter>
												<AlertDialogCancel>Cancelar</AlertDialogCancel>
												<AlertDialogAction
													variant="destructive"
													onClick={() => handleDelete(room.id)}
												>
													Excluir
												</AlertDialogAction>
											</AlertDialogFooter>
										</AlertDialogContent>
									</AlertDialog>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}
		</div>
	);
}
