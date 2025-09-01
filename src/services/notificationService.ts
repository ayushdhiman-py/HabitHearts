// Simple event emitter for notifying components of data changes
class EventEmitter {
  private events: { [key: string]: Function[] } = {};

  on(event: string, callback: Function) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  off(event: string, callback: Function) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    }
  }

  emit(event: string, data?: any) {
    if (this.events[event]) {
      this.events[event].forEach(callback => callback(data));
    }
  }
}

const eventEmitter = new EventEmitter();

// Notification service for broadcasting data changes
export const notificationService = {
  // Subscribe to events
  subscribe: (event: string, callback: Function) => {
    eventEmitter.on(event, callback);
  },

  // Unsubscribe from events
  unsubscribe: (event: string, callback: Function) => {
    eventEmitter.off(event, callback);
  },

  // Notify subscribers of task changes
  notifyTaskChange: () => {
    eventEmitter.emit('taskChange');
  },

  // Notify subscribers of calendar event changes
  notifyCalendarEventChange: () => {
    eventEmitter.emit('calendarEventChange');
  },

  // Notify subscribers of user changes
  notifyUserChange: () => {
    eventEmitter.emit('userChange');
  }
};

export default notificationService;