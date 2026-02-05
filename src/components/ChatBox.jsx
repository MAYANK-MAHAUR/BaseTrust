import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Send, User, Paperclip, Loader2, FileIcon } from 'lucide-react'

export function ChatBox({ supabaseId, contractId, currentUser, className }) {
    // Use contractId (on-chain ID) for message isolation - more reliable than Supabase's auto-increment id
    const chatRoomId = contractId ?? supabaseId
    const [messages, setMessages] = useState([])
    const [newMessage, setNewMessage] = useState('')
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const endRef = useRef(null)
    const fileInputRef = useRef(null)

    useEffect(() => {
        if (!chatRoomId || !supabase) {
            setLoading(false)
            return
        }

        // 1. Load initial messages
        const fetchMessages = async () => {
            const { data } = await supabase
                .from('messages')
                .select('*')
                .eq('escrow_id', chatRoomId)
                .order('created_at', { ascending: true })

            if (data) setMessages(data)
            setLoading(false)
        }

        fetchMessages()

        // 2. Subscribe to new messages
        const channel = supabase
            .channel(`chat:${chatRoomId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `escrow_id=eq.${chatRoomId}`
            }, (payload) => {
                setMessages(prev => {
                    const newMsg = payload.new

                    // 1. Check if we already have this exact ID (dedupe)
                    if (prev.some(m => m.id === newMsg.id)) return prev

                    // 2. Check for a matching "optimistic" message to replace
                    // (Same content, same sender, is temporary)
                    const tempMatchIndex = prev.findIndex(m =>
                        m.id.toString().startsWith('temp-') &&
                        m.content === newMsg.content &&
                        m.sender === newMsg.sender
                    )

                    if (tempMatchIndex !== -1) {
                        // Found a match! Replace the temp message with the real one
                        const newMessages = [...prev]
                        newMessages[tempMatchIndex] = newMsg
                        return newMessages
                    }

                    // 3. Otherwise, it's a new message (from someone else or another tab)
                    return [...prev, newMsg]
                })
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [chatRoomId])

    useEffect(() => {
        // Auto scroll to bottom
        endRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const handleSend = async (e) => {
        e?.preventDefault()
        if ((!newMessage.trim()) || !chatRoomId) return

        const msgContent = newMessage
        setNewMessage('') // Clear input

        // Optimistic UI Update
        const optimisticMsg = {
            id: 'temp-' + Date.now(),
            escrow_id: chatRoomId,
            sender: currentUser,
            content: msgContent,
            created_at: new Date().toISOString()
        }
        setMessages(prev => [...prev, optimisticMsg])

        const { error } = await supabase
            .from('messages')
            .insert([{
                escrow_id: chatRoomId,
                sender: currentUser,
                content: msgContent
            }])
            .select()

        if (error) {
            console.error("Failed to send:", error)
            // Rollback optimistic update
            setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id))
        }
    }

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file || !chatRoomId) return

        setUploading(true)
        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `${chatRoomId}/${Date.now()}.${fileExt}`
            const filePath = `${fileName}`

            // 1. Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('chat-attachments')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('chat-attachments')
                .getPublicUrl(filePath)

            // 3. Send Message with Attachment
            const { error: msgError } = await supabase
                .from('messages')
                .insert([{
                    escrow_id: chatRoomId,
                    sender: currentUser,
                    content: "Sent an attachment",
                    attachment_url: publicUrl,
                    attachment_type: file.type.startsWith('image/') ? 'image' : 'file'
                }])

            if (msgError) throw msgError

        } catch (error) {
            console.error("Upload failed:", error)
            alert("Upload failed. Make sure the 'chat-attachments' bucket exists and is public.")
        } finally {
            setUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    if (!supabase || !chatRoomId) {
        return (
            <div className="h-full flex items-center justify-center p-4 text-center text-xs text-muted-foreground bg-secondary/10 rounded-lg">
                <div className="space-y-2">
                    <p>Chat Unavailable</p>
                    {!supabase && <p className="text-[10px] opacity-70">Missing Configuration (Env Vars)</p>}
                </div>
            </div>
        )
    }

    return (
        <div className={`flex flex-col h-[300px] border border-border rounded-lg bg-background overflow-hidden ${className}`}>
            <div className="bg-secondary/30 p-3 text-sm font-medium border-b border-border flex items-center gap-2 sticky top-0 backdrop-blur-sm z-10">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Live Chat
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && !loading && (
                    <p className="text-center text-xs text-muted-foreground py-8">No messages yet. Say hi!</p>
                )}

                {messages.map((msg) => {
                    const isMe = msg.sender?.toLowerCase() === currentUser?.toLowerCase()
                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-lg p-3 text-sm ${isMe
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary text-secondary-foreground'
                                }`}>

                                {msg.attachment_url && (
                                    <div className="mb-2 rounded-md overflow-hidden bg-black/10">
                                        {msg.attachment_type === 'image' ? (
                                            <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer">
                                                <img
                                                    src={msg.attachment_url}
                                                    alt="Attachment"
                                                    className="max-w-full max-h-[200px] object-contain hover:opacity-90 transition-opacity cursor-zoom-in"
                                                />
                                            </a>
                                        ) : (
                                            <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 hover:bg-black/5 transition-colors">
                                                <FileIcon className="w-5 h-5" />
                                                <span className="underline text-xs">View File</span>
                                            </a>
                                        )}
                                    </div>
                                )}

                                <p>{msg.content}</p>
                                <p className={`text-[10px] mt-1 opacity-70 ${isMe ? 'text-primary-foreground' : ''}`}>
                                    {msg.sender.slice(0, 6)}...
                                </p>
                            </div>
                        </div>
                    )
                })}
                <div ref={endRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-3 bg-secondary/10 border-t border-border flex gap-2 items-center">
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileUpload}
                    accept="image/*,.pdf,.doc,.docx"
                />
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                >
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                </Button>

                <Input
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 h-9 text-sm"
                    disabled={uploading}
                />
                <Button type="submit" size="sm" className="h-9 px-3" disabled={uploading || !newMessage.trim()}>
                    <Send className="w-4 h-4" />
                </Button>
            </form>
        </div>
    )
}
