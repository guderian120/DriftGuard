import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Container,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
} from '@mui/material';
import {
  SmartToy as RobotIcon,
  Person as PersonIcon,
  Send as SendIcon,
  HelpOutline as HelpIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { DriftEvent } from '../types/api';
import { driftsService } from '../api/driftsService';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AiChatProps {
  drift?: DriftEvent;
  onClose?: () => void;
}

const AiChat: React.FC<AiChatProps> = ({ drift, onClose }) => {
  // Render logic
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (drift) {
      setOpen(true);
      initializeDriftChat();
    }
  }, [drift]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeDriftChat = () => {
    const initialMessages: ChatMessage[] = [
      {
        id: '1',
        role: 'assistant',
        content: `Hello! I can help you analyze this ${drift?.drift_type} drift detected in ${drift?.environment_name}. What specific questions do you have about this drift issue?`,
        timestamp: new Date(),
      },
    ];
    setMessages(initialMessages);
  };

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Simulate AI response for now
      // In real implementation, this would call Gemini AI API
      const context = drift ? `Regarding ${drift.drift_type} drift in ${drift.environment_name}:` : '';

      let responseContent = '';

      // Simple pattern matching for demo responses
      if (input.toLowerCase().includes('why') || input.toLowerCase().includes('cause')) {
        responseContent = `${context} This drift could be caused by manual changes in the cloud console, automated scripts running outside of IaC, or misconfigurations in your infrastructure code. I'll need to analyze the specific change details to give you a precise cause.`;
      } else if (input.toLowerCase().includes('fix') || input.toLowerCase().includes('resolve')) {
        responseContent = `${context} To resolve this, you can: 1) Update your IaC code to match the current cloud state, 2) Plan a rollback strategy, or 3) Adjust the cloud configuration. Would you like me to suggest specific Terraform/Azure ARM/Boto3 code changes?`;
      } else if (input.toLowerCase().includes('impact') || input.toLowerCase().includes('risks')) {
        responseContent = `${context} This configuration drift might affect service reliability, security compliance, or cost optimization. However, this could also be intentional if it was a temporary fix for an emergency situation.`;
      } else {
        responseContent = `${context} I can help you understand: 
• The root cause of this drift
• Best practices for fixing it
• Preventing similar issues in the future
• Impact assessment and mitigation strategies

What would you like to know more about?`;
      }

      // Simulate typing delay
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseContent,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('AI Chat error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClose = () => {
    setOpen(false);
    onClose?.();
  };

  const suggestedQuestions = [
    "Why did this drift occur?",
    "How can I fix it?",
    "What are the risks?",
    "Show me the Terraform code change needed"
  ];

  const chatContent = (
    <Box sx={{ height: '500px', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
        <List>
          {messages.map((message) => (
            <ListItem
              key={message.id}
              sx={{
                justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                mb: 1,
              }}
            >
              <Box sx={{
                display: 'flex',
                alignItems: 'flex-start',
                maxWidth: '80%',
                flexDirection: message.role === 'user' ? 'row-reverse' : 'row',
                gap: 1,
              }}>
                <Avatar
                  sx={{
                    bgcolor: message.role === 'user' ? 'primary.main' : 'secondary.main',
                    width: 32,
                    height: 32,
                  }}
                >
                  {message.role === 'user' ? <PersonIcon /> : <RobotIcon />}
                </Avatar>
                <Box
                  sx={{
                    bgcolor: message.role === 'user' ? 'primary.main' : 'grey.100',
                    borderRadius: 2,
                    p: 2,
                    color: message.role === 'user' ? 'white' : 'text.primary',
                  }}
                >
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {message.content}
                  </Typography>
                  <Typography
                    variant="caption"
                    color={message.role === 'user' ? 'grey.300' : 'text.secondary'}
                    sx={{ display: 'block', mt: 1, fontSize: '0.7rem' }}
                  >
                    {message.timestamp.toLocaleTimeString()}
                  </Typography>
                </Box>
              </Box>
            </ListItem>
          ))}
          {loading && (
            <ListItem sx={{ justifyContent: 'flex-start' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}>
                  <RobotIcon />
                </Avatar>
                <Box sx={{ bgcolor: 'grey.100', borderRadius: 2, p: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Analyzing your question...
                  </Typography>
                </Box>
              </Box>
            </ListItem>
          )}
        </List>
        <div ref={messagesEndRef} />
      </Box>

      {/* Suggested Questions */}
      {messages.length === 1 && !loading && (
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            <HelpIcon sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
            Suggested questions:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {suggestedQuestions.map((question) => (
              <Chip
                key={question}
                label={question}
                variant="outlined"
                size="small"
                onClick={() => setInput(question)}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Box>
        </Box>
      )}

      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me about this drift..."
            disabled={loading}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 3,
              }
            }}
          />
          <Button
            variant="contained"
            endIcon={<SendIcon />}
            onClick={handleSendMessage}
            disabled={!input.trim() || loading}
            sx={{ borderRadius: 3, px: 3 }}
          >
            Send
          </Button>
        </Box>
      </Box>
    </Box>
  );

  if (drift) {
    return (
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h6">
                AI Drift Analysis Assistant
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {drift.drift_type} drift in {drift.environment_name}
              </Typography>
            </Box>
            <Button
              onClick={handleClose}
              size="small"
              sx={{ minWidth: 'auto', p: 1 }}
            >
              <CloseIcon />
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {chatContent}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Container maxWidth="md">
      <Card elevation={3} sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h5" component="h2" gutterBottom>
              AI Drift Analysis Assistant
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Get expert help analyzing infrastructure drifts and creating fix recommendations.
              Ask me questions about causes, fixes, impacts, or best practices.
            </Typography>
          </Box>
          {chatContent}
        </CardContent>
      </Card>
    </Container>
  );
};

export default AiChat;
