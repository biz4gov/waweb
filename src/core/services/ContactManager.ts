import { EventEmitter } from 'events';
import type { 
  Contact, 
  ExternalContact, 
  ContactRegistrationRequest,
  Conversation,
  ConversationHistoryRequest 
} from '../../types/index.js';

class ContactManager extends EventEmitter {
  private contacts = new Map<string, Contact>();
  private externalToInternalMap = new Map<string, string>();
  private contactConversations = new Map<string, string[]>(); // contactId -> conversationIds[]

  constructor() {
    super();
  }

  public async registerContact(
    accountId: string,
    request: ContactRegistrationRequest
  ): Promise<Contact> {
    try {
      // Check if contact already exists
      const existingContactId = this.externalToInternalMap.get(
        `${accountId}:${request.externalContactId}`
      );

      if (existingContactId) {
        const existingContact = this.contacts.get(existingContactId);
        if (existingContact) {
          // Update existing contact
          existingContact.name = request.name || existingContact.name;
          existingContact.email = request.email || existingContact.email;
          existingContact.phone = request.phone || existingContact.phone;
          existingContact.metadata = { ...existingContact.metadata, ...request.metadata };
          existingContact.updatedAt = new Date();
          
          console.log(`📝 Contact updated: ${request.externalContactId}`);
          this.emit('contactUpdated', existingContact);
          return existingContact;
        }
      }

      // Create new contact
      const contactId = this.generateContactId();
      const contact: Contact = {
        id: contactId,
        externalContactId: request.externalContactId,
        accountId,
        channelSpecificIds: {},
        name: request.name,
        email: request.email,
        phone: request.phone,
        metadata: request.metadata || {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.contacts.set(contactId, contact);
      this.externalToInternalMap.set(`${accountId}:${request.externalContactId}`, contactId);
      this.contactConversations.set(contactId, []);

      console.log(`👤 New contact registered: ${request.externalContactId}`);
      this.emit('contactRegistered', contact);
      
      return contact;
    } catch (error) {
      console.error('Error registering contact:', error);
      throw error;
    }
  }

  public async findContactByExternalId(
    accountId: string,
    externalContactId: string
  ): Promise<Contact | null> {
    const contactId = this.externalToInternalMap.get(`${accountId}:${externalContactId}`);
    if (!contactId) {
      return null;
    }
    return this.contacts.get(contactId) || null;
  }

  public async findContactById(contactId: string): Promise<Contact | null> {
    return this.contacts.get(contactId) || null;
  }

  public async updateChannelSpecificId(
    contactId: string,
    channelType: string,
    channelSpecificId: string
  ): Promise<void> {
    const contact = this.contacts.get(contactId);
    if (contact) {
      contact.channelSpecificIds[channelType] = channelSpecificId;
      contact.updatedAt = new Date();
      this.emit('contactChannelUpdated', contact, channelType, channelSpecificId);
    }
  }

  public async findOrCreateContact(
    accountId: string,
    externalContactId: string,
    contactData?: Partial<ContactRegistrationRequest>
  ): Promise<Contact> {
    let contact = await this.findContactByExternalId(accountId, externalContactId);
    
    if (!contact) {
      const registrationRequest: ContactRegistrationRequest = {
        externalContactId,
        name: contactData?.name,
        email: contactData?.email,
        phone: contactData?.phone,
        metadata: contactData?.metadata
      };
      
      contact = await this.registerContact(accountId, registrationRequest);
    }
    
    return contact;
  }

  public async getContactConversations(
    accountId: string,
    request: ConversationHistoryRequest
  ): Promise<{
    conversations: Conversation[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const contact = await this.findContactByExternalId(accountId, request.externalContactId);
      if (!contact) {
        return { conversations: [], total: 0, hasMore: false };
      }

      const conversationIds = this.contactConversations.get(contact.id) || [];
      
      // This would typically query the database
      // For now, return mock data structure
      return {
        conversations: [],
        total: conversationIds.length,
        hasMore: false
      };
    } catch (error) {
      console.error('Error getting contact conversations:', error);
      throw error;
    }
  }

  public async addConversationToContact(contactId: string, conversationId: string): Promise<void> {
    const conversations = this.contactConversations.get(contactId) || [];
    if (!conversations.includes(conversationId)) {
      conversations.push(conversationId);
      this.contactConversations.set(contactId, conversations);
    }

    // Update last interaction
    const contact = this.contacts.get(contactId);
    if (contact) {
      contact.lastInteractionAt = new Date();
    }
  }

  public async updateContactInteraction(contactId: string): Promise<void> {
    const contact = this.contacts.get(contactId);
    if (contact) {
      contact.lastInteractionAt = new Date();
      contact.updatedAt = new Date();
    }
  }

  public async searchContacts(
    accountId: string,
    query: string,
    limit = 10
  ): Promise<Contact[]> {
    const results: Contact[] = [];
    const lowerQuery = query.toLowerCase();

    for (const contact of this.contacts.values()) {
      if (contact.accountId !== accountId) continue;
      
      const matchesName = contact.name?.toLowerCase().includes(lowerQuery);
      const matchesEmail = contact.email?.toLowerCase().includes(lowerQuery);
      const matchesPhone = contact.phone?.includes(query);
      const matchesExternalId = contact.externalContactId.includes(query);

      if (matchesName || matchesEmail || matchesPhone || matchesExternalId) {
        results.push(contact);
        if (results.length >= limit) break;
      }
    }

    return results;
  }

  private generateContactId(): string {
    return `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public getContactStats(accountId: string) {
    let totalContacts = 0;
    let activeContacts = 0;
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);

    for (const contact of this.contacts.values()) {
      if (contact.accountId === accountId) {
        totalContacts++;
        if (contact.lastInteractionAt && contact.lastInteractionAt.getTime() > oneDayAgo) {
          activeContacts++;
        }
      }
    }

    return {
      total: totalContacts,
      active24h: activeContacts,
      mapped: this.externalToInternalMap.size
    };
  }

  public async removeContact(accountId: string, externalContactId: string): Promise<boolean> {
    const contactId = this.externalToInternalMap.get(`${accountId}:${externalContactId}`);
    if (!contactId) {
      return false;
    }

    this.contacts.delete(contactId);
    this.externalToInternalMap.delete(`${accountId}:${externalContactId}`);
    this.contactConversations.delete(contactId);

    console.log(`🗑️ Contact removed: ${externalContactId}`);
    this.emit('contactRemoved', externalContactId);
    
    return true;
  }
}

export const contactManager = new ContactManager();