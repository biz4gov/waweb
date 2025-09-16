import { EventEmitter } from 'events';
import * as nodemailer from 'nodemailer';
import * as Imap from 'imap';
import { simpleParser } from 'mailparser';
import type { 
  Channel, 
  Contact, 
  Conversation, 
  OmnichannelMessage,
  ChannelConfiguration 
} from '../../types/index.js';

interface EmailAccount {
  id: string;
  channelId: string;
  email: string;
  config: ChannelConfiguration['email'];
  isActive: boolean;
  lastSync: Date;
}

interface ParsedEmail {
  messageId: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  text?: string;
  html?: string;
  date: Date;
  attachments: EmailAttachment[];
  inReplyTo?: string;
  references?: string[];
}

interface EmailAttachment {
  filename: string;
  contentType: string;
  size: number;
  content: Buffer;
}

interface SendEmailOptions {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: nodemailer.Attachment[];
  inReplyTo?: string;
  references?: string[];
}

class EmailService extends EventEmitter {
  private accounts = new Map<string, EmailAccount>();
  private transporters = new Map<string, nodemailer.Transporter>();
  private imapConnections = new Map<string, Imap>();
  private syncIntervals = new Map<string, NodeJS.Timeout>();

  constructor() {
    super();
    this.setMaxListeners(1000);
  }

  public async addEmailAccount(
    channelId: string,
    emailConfig: ChannelConfiguration['email']
  ): Promise<void> {
    if (!emailConfig) {
      throw new Error('Email configuration is required');
    }

    try {
      console.log(`📧 Adding email account for channel: ${channelId}`);

      // Create SMTP transporter
      const transporter = nodemailer.createTransporter({
        host: emailConfig.smtpHost,
        port: emailConfig.smtpPort,
        secure: emailConfig.secure,
        auth: {
          user: emailConfig.username,
          pass: emailConfig.password
        },
        pool: true,
        maxConnections: 5,
        maxMessages: 100
      });

      // Verify SMTP connection
      await transporter.verify();
      console.log(`✅ SMTP connection verified for ${emailConfig.username}`);

      // Create IMAP connection
      const imapConfig: Imap.Config = {
        user: emailConfig.username,
        password: emailConfig.password,
        host: emailConfig.imapHost,
        port: emailConfig.imapPort,
        tls: emailConfig.secure,
        tlsOptions: {
          rejectUnauthorized: false
        },
        keepalive: {
          interval: 10000,
          idleInterval: 300000,
          forceNoop: true
        }
      };

      const imap = new Imap(imapConfig);
      
      // Setup IMAP event handlers
      this.setupImapHandlers(channelId, imap);

      // Connect IMAP
      await this.connectImap(imap);
      console.log(`✅ IMAP connection established for ${emailConfig.username}`);

      // Store account info
      const account: EmailAccount = {
        id: channelId,
        channelId,
        email: emailConfig.username,
        config: emailConfig,
        isActive: true,
        lastSync: new Date()
      };

      this.accounts.set(channelId, account);
      this.transporters.set(channelId, transporter);
      this.imapConnections.set(channelId, imap);

      // Start periodic sync
      this.startPeriodicSync(channelId);

      this.emit('accountReady', channelId, account);
      console.log(`✅ Email account ready: ${emailConfig.username}`);

    } catch (error) {
      console.error(`❌ Failed to add email account for channel ${channelId}:`, error);
      throw error;
    }
  }

  private async connectImap(imap: Imap): Promise<void> {
    return new Promise((resolve, reject) => {
      imap.once('ready', () => resolve());
      imap.once('error', (error) => reject(error));
      imap.connect();
    });
  }

  private setupImapHandlers(channelId: string, imap: Imap): void {
    imap.on('ready', () => {
      console.log(`📬 IMAP ready for channel ${channelId}`);
      this.openInbox(channelId, imap);
    });

    imap.on('error', (error) => {
      console.error(`IMAP error for channel ${channelId}:`, error);
      this.handleImapError(channelId, error);
    });

    imap.on('end', () => {
      console.log(`📭 IMAP connection ended for channel ${channelId}`);
    });

    imap.on('mail', (numNewMsgs) => {
      console.log(`📩 ${numNewMsgs} new emails received in channel ${channelId}`);
      this.fetchNewEmails(channelId, imap);
    });
  }

  private async openInbox(channelId: string, imap: Imap): Promise<void> {
    return new Promise((resolve, reject) => {
      imap.openBox('INBOX', false, (error, box) => {
        if (error) {
          reject(error);
          return;
        }
        
        console.log(`📮 Inbox opened for channel ${channelId}: ${box.messages.total} messages`);
        
        // Fetch recent unseen emails
        this.fetchNewEmails(channelId, imap);
        resolve();
      });
    });
  }

  private async fetchNewEmails(channelId: string, imap: Imap): Promise<void> {
    try {
      const account = this.accounts.get(channelId);
      if (!account) return;

      // Search for unseen messages
      imap.search(['UNSEEN'], (error, results) => {
        if (error) {
          console.error(`Error searching emails for ${channelId}:`, error);
          return;
        }

        if (results.length === 0) {
          console.log(`No new emails for channel ${channelId}`);
          return;
        }

        console.log(`📨 Processing ${results.length} new emails for channel ${channelId}`);

        const fetch = imap.fetch(results, {
          bodies: '',
          markSeen: true,
          struct: true
        });

        fetch.on('message', (msg, seqno) => {
          this.processIncomingEmail(channelId, msg, seqno);
        });

        fetch.once('error', (error) => {
          console.error(`Error fetching emails for ${channelId}:`, error);
        });

        fetch.once('end', () => {
          console.log(`✅ Finished processing emails for channel ${channelId}`);
          account.lastSync = new Date();
        });
      });
    } catch (error) {
      console.error(`Error in fetchNewEmails for ${channelId}:`, error);
    }
  }

  private async processIncomingEmail(channelId: string, msg: any, seqno: number): Promise<void> {
    try {
      let emailBuffer = '';

      msg.on('body', (stream: any) => {
        stream.on('data', (chunk: any) => {
          emailBuffer += chunk.toString('utf8');
        });
      });

      msg.once('end', async () => {
        try {
          const parsed = await simpleParser(emailBuffer);
          const email = this.convertToEmailFormat(parsed);
          
          await this.handleIncomingEmail(channelId, email);
        } catch (error) {
          console.error(`Error parsing email ${seqno} for channel ${channelId}:`, error);
        }
      });

    } catch (error) {
      console.error(`Error processing incoming email for ${channelId}:`, error);
    }
  }

  private convertToEmailFormat(parsed: any): ParsedEmail {
    return {
      messageId: parsed.messageId || '',
      from: parsed.from?.text || '',
      to: parsed.to?.text ? [parsed.to.text] : [],
      cc: parsed.cc?.text ? [parsed.cc.text] : undefined,
      bcc: parsed.bcc?.text ? [parsed.bcc.text] : undefined,
      subject: parsed.subject || '',
      text: parsed.text || '',
      html: parsed.html || '',
      date: parsed.date || new Date(),
      attachments: (parsed.attachments || []).map((att: any) => ({
        filename: att.filename || 'attachment',
        contentType: att.contentType || 'application/octet-stream',
        size: att.size || 0,
        content: att.content
      })),
      inReplyTo: parsed.inReplyTo,
      references: parsed.references
    };
  }

  private async handleIncomingEmail(channelId: string, email: ParsedEmail): Promise<void> {
    try {
      // Lazy load dependencies
      const { persistenceService } = await import('./PersistenceService.js');
      const { routingService } = await import('./RoutingService.js');
      const { webhookManager } = await import('../managers/WebhookManager.js');

      const accountId = await this.getAccountIdFromChannel(channelId);
      const contactExternalId = this.extractEmailAddress(email.from);

      // Find or create contact
      const contact = await persistenceService.findOrCreateContact(
        accountId,
        contactExternalId,
        {
          email: contactExternalId,
          name: this.extractNameFromEmail(email.from),
          platform: 'email'
        }
      );

      // Get assigned agent
      const agentId = await routingService.getAssignedAgent(
        accountId,
        contact.id,
        channelId
      );

      // Find or create conversation
      const conversation = await persistenceService.findOrCreateConversation(
        accountId,
        channelId,
        contact.id,
        agentId
      );

      // Determine content
      const content = email.text || email.html || email.subject;
      const contentType = email.html ? 'html' : 'text';

      // Insert message
      const insertedMessage = await persistenceService.insertMessage({
        conversationId: conversation.id,
        channelMessageId: email.messageId,
        direction: 'INBOUND',
        content,
        contentType: contentType as any,
        sentAt: email.date,
        channelSpecificData: {
          subject: email.subject,
          from: email.from,
          to: email.to,
          cc: email.cc,
          bcc: email.bcc,
          hasAttachments: email.attachments.length > 0,
          attachmentCount: email.attachments.length,
          inReplyTo: email.inReplyTo,
          references: email.references
        }
      });

      console.log(`📧 Email processed: ${insertedMessage.id} from ${email.from}`);

      // Dispatch webhook
      await webhookManager.dispatch(accountId, 'MESSAGE_CREATED', {
        message: insertedMessage,
        conversation,
        contact,
        direction: 'inbound',
        channel: 'email'
      });

    } catch (error) {
      console.error('Error handling incoming email:', error);
    }
  }

  public async sendEmail(channelId: string, options: SendEmailOptions): Promise<void> {
    const transporter = this.transporters.get(channelId);
    const account = this.accounts.get(channelId);
    
    if (!transporter || !account) {
      throw new Error(`No email account found for channel ${channelId}`);
    }

    try {
      const mailOptions = {
        from: account.email,
        ...options
      };

      const result = await transporter.sendMail(mailOptions);
      
      console.log(`📤 Email sent from ${account.email} to ${options.to}`);
      console.log(`Message ID: ${result.messageId}`);
      
      return result;
    } catch (error) {
      console.error(`❌ Failed to send email from channel ${channelId}:`, error);
      throw error;
    }
  }

  public async replyToEmail(
    channelId: string,
    originalMessageId: string,
    subject: string,
    content: string,
    recipientEmail: string
  ): Promise<void> {
    return this.sendEmail(channelId, {
      to: recipientEmail,
      subject: `Re: ${subject}`,
      text: content,
      inReplyTo: originalMessageId,
      references: [originalMessageId]
    });
  }

  private extractEmailAddress(emailString: string): string {
    const match = emailString.match(/<(.+)>/);
    return match ? match[1] : emailString.split(' ')[0];
  }

  private extractNameFromEmail(emailString: string): string {
    const match = emailString.match(/^(.+)\s*<.+>$/);
    return match ? match[1].trim() : '';
  }

  private startPeriodicSync(channelId: string): void {
    const interval = setInterval(() => {
      const imap = this.imapConnections.get(channelId);
      if (imap && imap.state === 'connected') {
        this.fetchNewEmails(channelId, imap);
      }
    }, 60000); // Check every minute

    this.syncIntervals.set(channelId, interval);
  }

  private handleImapError(channelId: string, error: Error): void {
    console.error(`IMAP error for channel ${channelId}:`, error);
    
    // Attempt to reconnect after delay
    setTimeout(() => {
      this.reconnectImap(channelId);
    }, 30000);
  }

  private async reconnectImap(channelId: string): Promise<void> {
    try {
      const account = this.accounts.get(channelId);
      if (!account || !account.isActive) return;

      console.log(`🔄 Attempting to reconnect IMAP for channel ${channelId}`);
      
      const oldImap = this.imapConnections.get(channelId);
      if (oldImap) {
        oldImap.destroy();
      }

      // Create new IMAP connection
      const imapConfig: Imap.Config = {
        user: account.config!.username,
        password: account.config!.password,
        host: account.config!.imapHost,
        port: account.config!.imapPort,
        tls: account.config!.secure
      };

      const imap = new Imap(imapConfig);
      this.setupImapHandlers(channelId, imap);
      await this.connectImap(imap);
      
      this.imapConnections.set(channelId, imap);
      console.log(`✅ IMAP reconnected for channel ${channelId}`);
      
    } catch (error) {
      console.error(`Failed to reconnect IMAP for channel ${channelId}:`, error);
    }
  }

  private async getAccountIdFromChannel(channelId: string): Promise<string> {
    // This would typically query the database to get the account ID
    return 'default-account-id';
  }

  public getAccount(channelId: string): EmailAccount | undefined {
    return this.accounts.get(channelId);
  }

  public async removeAccount(channelId: string): Promise<void> {
    const account = this.accounts.get(channelId);
    if (!account) return;

    console.log(`🗑️ Removing email account for channel: ${channelId}`);

    // Stop sync interval
    const interval = this.syncIntervals.get(channelId);
    if (interval) {
      clearInterval(interval);
      this.syncIntervals.delete(channelId);
    }

    // Close IMAP connection
    const imap = this.imapConnections.get(channelId);
    if (imap) {
      imap.end();
      this.imapConnections.delete(channelId);
    }

    // Close SMTP transporter
    const transporter = this.transporters.get(channelId);
    if (transporter) {
      transporter.close();
      this.transporters.delete(channelId);
    }

    this.accounts.delete(channelId);
    console.log(`✅ Email account removed: ${account.email}`);
  }

  public async shutdown(): Promise<void> {
    console.log('🔄 Shutting down Email service...');
    
    const shutdownPromises = [];
    for (const [channelId] of this.accounts) {
      shutdownPromises.push(this.removeAccount(channelId));
    }
    
    await Promise.all(shutdownPromises);
    console.log('✅ Email service shutdown complete');
  }
}

export const emailService = new EmailService();