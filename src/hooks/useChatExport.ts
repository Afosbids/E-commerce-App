import { useCallback } from 'react';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { Message } from './useAIChat';
import { toast } from 'sonner';

export function useChatExport() {
  const formatMessagesAsText = useCallback((messages: Message[]): string => {
    const header = `Chat Export - ${format(new Date(), 'PPpp')}\n${'='.repeat(50)}\n\n`;
    
    const content = messages.map((msg) => {
      const role = msg.role === 'user' ? 'You' : 'AI Assistant';
      const timestamp = msg.timestamp ? format(msg.timestamp, 'h:mm a') : '';
      return `[${role}]${timestamp ? ` (${timestamp})` : ''}\n${msg.content}\n`;
    }).join('\n');
    
    return header + content;
  }, []);

  const exportAsText = useCallback((messages: Message[], filename?: string) => {
    if (messages.length === 0) {
      toast.error('No messages to export');
      return;
    }

    const text = formatMessagesAsText(messages);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `chat-export-${format(new Date(), 'yyyy-MM-dd-HHmm')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Chat exported as text file');
  }, [formatMessagesAsText]);

  const exportAsPDF = useCallback((messages: Message[], filename?: string) => {
    if (messages.length === 0) {
      toast.error('No messages to export');
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxWidth = pageWidth - margin * 2;
    let yPosition = 20;
    
    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Chat Export', margin, yPosition);
    yPosition += 8;
    
    // Date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(format(new Date(), 'PPpp'), margin, yPosition);
    yPosition += 15;
    
    // Reset text color
    doc.setTextColor(0);
    
    messages.forEach((msg) => {
      // Check if we need a new page
      if (yPosition > doc.internal.pageSize.getHeight() - 30) {
        doc.addPage();
        yPosition = 20;
      }
      
      // Role header
      const role = msg.role === 'user' ? 'You' : 'AI Assistant';
      const timestamp = msg.timestamp ? ` (${format(msg.timestamp, 'h:mm a')})` : '';
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(msg.role === 'user' ? 59 : 100, msg.role === 'user' ? 130 : 100, msg.role === 'user' ? 246 : 100);
      doc.text(`${role}${timestamp}`, margin, yPosition);
      yPosition += 6;
      
      // Message content
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0);
      doc.setFontSize(10);
      
      const lines = doc.splitTextToSize(msg.content, maxWidth);
      lines.forEach((line: string) => {
        if (yPosition > doc.internal.pageSize.getHeight() - 20) {
          doc.addPage();
          yPosition = 20;
        }
        doc.text(line, margin, yPosition);
        yPosition += 5;
      });
      
      yPosition += 8;
    });
    
    doc.save(filename || `chat-export-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`);
    toast.success('Chat exported as PDF');
  }, []);

  return { exportAsText, exportAsPDF };
}
