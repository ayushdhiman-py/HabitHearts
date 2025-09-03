import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import colors from '../../theme/colors';
import { responsiveFontSize, scale, verticalScale, moderateScale } from '../../utils/responsive';
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
        style={[styles.actionButton, styles.deleteButton]}
        onPress={(e) => {
          e.stopPropagation();
          onDeleteTask(item.id);
        }}
      >
        <Icon name="delete" size={responsiveFontSize(18)} color={colors.textLight} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  taskItem: {
    backgroundColor: colors.white,
    borderRadius: moderateScale(18),
    padding: moderateScale(18),
    marginBottom: verticalScale(12),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderLeftWidth: 5,
    borderLeftColor: colors.primary,
  },
  taskTextContainer: {
    flex: 1,
    marginRight: scale(10),
  },
  taskText: {
    fontSize: responsiveFontSize(17),
    color: colors.text,
    fontWeight: '500',
    lineHeight: responsiveFontSize(22),
  },
  completedTask: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  creatorText: {
    fontSize: responsiveFontSize(13),
    color: colors.textSecondary,
    marginTop: verticalScale(4),
    fontStyle: 'italic',
  },
  taskActions: {
    flexDirection: 'row',
  },
  actionButton: {
    width: verticalScale(36),
    height: verticalScale(36),
    borderRadius: moderateScale(18),
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: scale(8),
  },
  deleteButton: {
    backgroundColor: colors.primaryLight,
  },
});

export default TaskItem;