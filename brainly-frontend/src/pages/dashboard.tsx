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

export function Dashboard() {
    const [modalOpen, setModalOpen] = useState(false);

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

    return (
        <>
            <div>
                <Sidebar />

                <div className="p-4 ml-72 min-h-screen bg-gray-100">
                    <CreateContentModal
                        open={modalOpen}
                        onClose={() => {
                            setModalOpen(false);
                        }}
                    />

                    <div className="flex justify-end gap-4">
                        <Button
                            onClick={() => {
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

                    <div className="flex gap-4 flex-wrap mt-4">
                        {contents.map(
                            ({
                                type,
                                link,
                                title,
                            }) => (
                                <Card
                                    key={`${title}-${link}`}
                                    type={type}
                                    link={link}
                                    title={title}
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