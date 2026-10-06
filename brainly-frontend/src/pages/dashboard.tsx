import { useEffect, useState } from "react";
import "../App.css";

import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { CreateContentModal } from "../components/CreateContentModal";

import { PlusIcon } from "../icons/PlusIcon";
import { ShareIcon } from "../icons/ShareIcon";
import { Sidebar } from "../components/Sidebar";

import { useContent } from "../hooks/useContent";

import axios from "axios";
import { BACKEND_URL } from "../config";
import { useNavigate } from "react-router-dom";

type ContentType = "twitter" | "youtube";

interface Content {
    _id: string;
    title: string;
    link: string;
    type: ContentType;
}

export function Dashboard() {
    const [modalOpen, setModalOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState("");
    const [editingContent, setEditingContent] = useState<Content | null>(null);

    const { contents, refresh } = useContent();

    const navigate = useNavigate();

    useEffect(() => {
        refresh();
    }, [modalOpen]);

    function logout() {
        localStorage.removeItem("token");
        navigate("/signin");
    }

    async function createShareLink() {
        try {
            const token = localStorage.getItem("token");

            const response = await axios.post(
                `${BACKEND_URL}/api/v1/brain/share`,
                {
                    share: true,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const shareUrl = `http://localhost:5173/share/${response.data.hash}`;

            alert(shareUrl);
        } catch {
            localStorage.removeItem("token");
            navigate("/signin");
        }
    }

    async function deleteContent(contentId: string) {
        const confirmed = window.confirm(
            "Are you sure you want to delete this content?"
        );

        if (!confirmed) {
            return;
        }

        try {
            setDeleteError("");
            setDeletingId(contentId);

            const token = localStorage.getItem("token");

            if (!token) {
                navigate("/signin");
                return;
            }

            await axios.delete(
                `${BACKEND_URL}/api/v1/content`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    data: {
                        contentId,
                    },
                }
            );

            await refresh();
        } catch (error) {
            console.error("Failed to delete content:", error);

            if (axios.isAxiosError(error)) {
                if (error.response?.status === 401) {
                    localStorage.removeItem("token");
                    navigate("/signin");
                    return;
                }

                setDeleteError(
                    error.response?.data?.message ||
                    "Failed to delete content. Please try again."
                );

                return;
            }

            setDeleteError(
                "Failed to delete content. Please try again."
            );
        } finally {
            setDeletingId(null);
        }
    }

    function editContent(contentId: string) {
        const content = contents.find(
            (item: Content) => item._id === contentId
        );

        if (!content) {
            return;
        }

        setEditingContent({
            _id: content._id,
            title: content.title,
            link: content.link,
            type: content.type,
        });

        setModalOpen(true);
    }

    function closeContentModal() {
        setModalOpen(false);
        setEditingContent(null);
    }

    async function handleContentUpdated() {
        await refresh();
    }

    return (
        <>
            <div>
                <Sidebar />

                <div className="p-4 ml-72 min-h-screen bg-gray-100">
                    <CreateContentModal
                        open={modalOpen}
                        onClose={closeContentModal}
                        editContent={
                            editingContent
                                ? {
                                    id: editingContent._id,
                                    title: editingContent.title,
                                    link: editingContent.link,
                                    type: editingContent.type,
                                }
                                : null
                        }
                        onUpdated={handleContentUpdated}
                    />

                    <div className="flex justify-end gap-4">
                        <Button
                            onClick={() => {
                                setEditingContent(null);
                                setModalOpen(true);
                            }}
                            size="md"
                            variant="primary"
                            text="Add Content"
                            startIcon={<PlusIcon />}
                        />

                        <Button
                            onClick={createShareLink}
                            variant="secondary"
                            text="Share Brain"
                            startIcon={<ShareIcon />}
                        />

                        <Button
                            onClick={logout}
                            variant="secondary"
                            text="Logout"
                        />
                    </div>

                    {deleteError && (
                        <div className="mt-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md">
                            {deleteError}
                        </div>
                    )}

                    <div className="flex gap-4 flex-wrap mt-4">
                        {contents.map(
                            ({
                                _id,
                                type,
                                link,
                                title,
                            }: Content) => (
                                <Card
                                    key={_id}
                                    id={_id}
                                    type={type}
                                    link={link}
                                    title={title}
                                    onDelete={deleteContent}
                                    isDeleting={deletingId === _id}
                                    onEdit={editContent}
                                />
                            )
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

export default Dashboard;