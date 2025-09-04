import { Swipeable } from 'react-native-gesture-handler';

class SwipeableManager {
  private swipeables: Map<string, Swipeable> = new Map();

  register(id: string, swipeable: Swipeable) {
    this.swipeables.set(id, swipeable);
  }

  unregister(id: string) {
    this.swipeables.delete(id);
  }

  closeAllExcept(exceptId: string) {
    this.swipeables.forEach((swipeable, id) => {
      if (id !== exceptId) {
        swipeable.close();
      }
    });
  }

  closeAll() {
    this.swipeables.forEach(swipeable => {
      swipeable.close();
    });
  }
}

export const swipeableManager = new SwipeableManager();