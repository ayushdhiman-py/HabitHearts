import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import colors from '../../theme/colors';
import { responsiveFontSize, scale, verticalScale } from '../../utils/responsive';
import { Task } from '../../services/taskService';

interface TaskItemProps {
  item: Task;
  user: any;
  onOpenTaskDetail: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ item, user, onOpenTaskDetail, onDeleteTask }) => {
  return (
    <TouchableOpacity
      style={styles.taskItem}
      onPress={() => onOpenTaskDetail(item)}
    >
      <View style={styles.taskTextContainer}>
        <Text style={[styles.taskText, item.completed && styles.completedTask]}>
          {item.text}
        </Text>
        {item.createdBy !== user?.uid && (
          <Text style={styles.creatorText}>by {item.creatorName}</Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={(e) => {
          e.stopPropagation();
          onDeleteTask(item.id);
        }}
      >
        <Icon name="delete" size={responsiveFontSize(18)} color={colors.textSecondary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  taskItem: {
    backgroundColor: colors.surface,
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(16),
    marginBottom: verticalScale(8),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  taskTextContainer: {
    flex: 1,
    marginRight: scale(10),
  },
  taskText: {
    fontSize: responsiveFontSize(16),
    color: colors.text,
    lineHeight: responsiveFontSize(22),
  },
  completedTask: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  creatorText: {
    fontSize: responsiveFontSize(12),
    color: colors.textSecondary,
    marginTop: verticalScale(2),
  },
  deleteButton: {
    padding: scale(4),
  },
});

export default TaskItem;