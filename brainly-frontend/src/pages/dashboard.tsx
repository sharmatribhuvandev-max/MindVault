
import { useEffect, useState } from 'react';
import '../App.css'
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { CreateContentModal } from '../components/CreateContentModal';
import { PlusIcon } from '../icons/PlusIcon';
import { ShareIcon } from '../icons/ShareIcon';
import { Sidebar } from '../components/Sidebar';
import { useContent } from '../hooks/useContent';
import axios from 'axios';
import { BACKEND_URL } from '../config';

export function Dashboard() {
  const [modalOpen, setModalOpen] = useState(false);
  const {contents, refresh} = useContent();

  useEffect(() => {
    refresh();
  }, [modalOpen])

  return (
    <>
      <div>
        <Sidebar />
        <div className="p-4 ml-72 min-h-screen bg-gray-100">
          <CreateContentModal open={modalOpen} onClose={() => {
            setModalOpen(false);

          }} />


          <div className="flex justify-end gap-4">
            <Button onClick={() => {
              setModalOpen(true)
            }} size="md" variant="primary" text="Add Content" startIcon={<PlusIcon />}></Button>
            <Button onClick={async () => {
              const response = await axios.post(`${BACKEND_URL}/api/v1/brain/share`, {
                share: true
              }, {
                headers: {
                  "Authorization": localStorage.getItem("token")
                }
              });
              const shareUrl = `https://localhost:5173/share/${response.data.hash}`;
              alert(shareUrl);
            }} variant="secondary" text="Share Brain" startIcon={<ShareIcon />}></Button>
          </div>

          <div className="flex gap-4 flex-wrap">
    
            {contents.map(({ type, link, title }) => <Card
              type={type}
              link={link}
              title={title}
            />)}

            {/* <Card type="twitter" link="https://x.com/X/status/2043383260927918213" title="First tweet" /> */}
            {/* <Card type="youtube" link="https://www.youtube.com/watch?v=IRT-orFZ1fo" title="First video" /> */}
          </div>
        </div>
      </div>
    </>
  )
}

export default Dashboard
