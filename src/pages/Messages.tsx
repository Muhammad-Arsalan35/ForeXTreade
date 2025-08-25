import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle, Send, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

// Sample messages data
const sampleMessages = [
  {
    id: 1,
    sender: "Support Team",
    message: "Welcome to our platform! How can we help you today?",
    timestamp: "2025-01-15 10:30",
    isRead: false,
    type: "support"
  },
  {
    id: 2,
    sender: "System Notification",
    message: "Your task has been completed successfully. Earnings have been added to your wallet.",
    timestamp: "2025-01-15 09:15",
    isRead: true,
    type: "system"
  },
  {
    id: 3,
    sender: "Hiring Manager",
    message: "Great job on completing your monthly targets! Keep up the excellent work.",
    timestamp: "2025-01-14 16:45",
    isRead: true,
    type: "manager"
  },
  {
    id: 4,
    sender: "Team Leader",
    message: "New team bonus opportunity available. Check your dashboard for details.",
    timestamp: "2025-01-14 14:20",
    isRead: false,
    type: "team"
  }
];

export const Messages = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<typeof sampleMessages[0] | null>(null);
  const navigate = useNavigate();

  const filteredMessages = sampleMessages.filter(message =>
    message.sender.toLowerCase().includes(searchTerm.toLowerCase()) ||
    message.message.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getMessageTypeColor = (type: string) => {
    switch (type) {
      case "support":
        return "bg-blue-100 text-blue-800";
      case "system":
        return "bg-green-100 text-green-800";
      case "manager":
        return "bg-purple-100 text-purple-800";
      case "team":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-primary p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pt-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="p-0 h-auto">
          <ArrowLeft className="w-5 h-5 text-primary-foreground" />
        </Button>
        <h1 className="text-xl font-bold text-primary-foreground">Messages</h1>
      </div>

      <div className="max-w-md mx-auto space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search messages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Messages List */}
        <div className="space-y-3">
          {filteredMessages.map((message) => (
            <Card 
              key={message.id} 
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedMessage?.id === message.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedMessage(message)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-sm">{message.sender}</h3>
                      <Badge className={`text-xs ${getMessageTypeColor(message.type)}`}>
                        {message.type}
                      </Badge>
                      {!message.isRead && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {message.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {message.timestamp}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Message Detail */}
        {selectedMessage && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="text-lg">{selectedMessage.sender}</span>
                <Badge className={getMessageTypeColor(selectedMessage.type)}>
                  {selectedMessage.type}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm">{selectedMessage.message}</p>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{selectedMessage.timestamp}</span>
                <span>{selectedMessage.isRead ? 'Read' : 'Unread'}</span>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" variant="outline">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Reply
                </Button>
                <Button className="flex-1" variant="outline">
                  <Send className="w-4 h-4 mr-2" />
                  Forward
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Messages */}
        {filteredMessages.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No messages found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Try adjusting your search terms' : 'You have no messages yet'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

