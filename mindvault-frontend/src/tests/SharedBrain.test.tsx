import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import axios from 'axios'
import { SharedBrain } from '../pages/SharedBrain'

vi.mock('axios', () => ({
    default: {
        get: vi.fn(),
        isAxiosError: vi.fn(() => false),
    },
}))

vi.mock('../components/Card', () => ({
    Card: ({ title }: { title: string }) => <article>{title}</article>,
}))

function renderSharedBrain() {
    return render(
        <MemoryRouter initialEntries={['/share/abc123']}>
            <Routes>
                <Route path="/share/:hash" element={<SharedBrain />} />
            </Routes>
        </MemoryRouter>,
    )
}

beforeEach(() => {
    vi.clearAllMocks()
    document.title = 'Mind Vault'
})

afterEach(() => {
    cleanup()
})

describe('SharedBrain page', () => {
    it("shows the owner's username, initial, and item count", async () => {
        vi.mocked(axios.get).mockResolvedValue({
            data: {
                username: 'tribhuvan',
                content: [
                    { _id: '1', title: 'React Tutorial', link: 'https://youtu.be/x', type: 'youtube' },
                    { _id: '2', title: 'A thread', link: 'https://x.com/a/status/1', type: 'twitter' },
                ],
            },
        } as never)

        renderSharedBrain()

        expect(
            await screen.findByRole('heading', { level: 1, name: "tribhuvan's Brain" }),
        ).toBeInTheDocument()
        expect(screen.getByText('T')).toBeInTheDocument()
        expect(screen.getByText(/Shared by/)).toHaveTextContent('Shared by tribhuvan · 2 items')
        // The title is set in an effect that can run just after the heading renders.
        await waitFor(() => {
            expect(document.title).toBe("tribhuvan's Brain · Mind Vault")
        })
        expect(axios.get).toHaveBeenCalledWith(expect.stringMatching(/\/api\/v1\/abc123$/))
    })

    it('uses the singular for one item', async () => {
        vi.mocked(axios.get).mockResolvedValue({
            data: {
                username: 'sam',
                content: [
                    { _id: '1', title: 'Only one', link: 'https://youtu.be/x', type: 'youtube' },
                ],
            },
        } as never)

        renderSharedBrain()

        expect(await screen.findByText(/Shared by/)).toHaveTextContent('Shared by sam · 1 item')
    })

    it('restores the tab title when leaving the page', async () => {
        vi.mocked(axios.get).mockResolvedValue({
            data: { username: 'sam', content: [] },
        } as never)

        const { unmount } = renderSharedBrain()
        await screen.findByRole('heading', { level: 1, name: "sam's Brain" })

        unmount()

        expect(document.title).toBe('Mind Vault')
    })

    it('shows not found for an invalid link', async () => {
        vi.mocked(axios.isAxiosError).mockReturnValue(true)
        vi.mocked(axios.get).mockRejectedValue({ response: { status: 404 } })
        vi.spyOn(console, 'error').mockImplementation(() => {})

        renderSharedBrain()

        expect(
            await screen.findByRole('heading', { name: 'Shared Brain Not Found' }),
        ).toBeInTheDocument()
    })
})
