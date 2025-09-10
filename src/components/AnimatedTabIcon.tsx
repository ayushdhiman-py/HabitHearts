import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface AnimatedTabIconProps {
  name: string;
  focusedName: string;
  color: string;
  size: number;
  focused: boolean;
}

const AnimatedTabIcon: React.FC<AnimatedTabIconProps> = ({ 
  name, 
  focusedName, 
  color, 
  size, 
  focused 
}) => {
  const scaleValue = useRef(new Animated.Value(1)).current;
  const translateYValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (focused) {
      // Animate icon when focused - subtle bounce effect
      Animated.sequence([
        // Move up and scale up
        Animated.parallel([
          Animated.timing(scaleValue, {
            toValue: 1.2,
            duration: 200,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(translateYValue, {
            toValue: -5,
            duration: 200,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          })
        ]),
        // Return to normal
        Animated.parallel([
          Animated.timing(scaleValue, {
            toValue: 1,
            duration: 200,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(translateYValue, {
            toValue: 0,
            duration: 200,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          })
        ])
      ]).start();
    }
  }, [focused]);

  return (
    <Animated.View
      style={{
        transform: [
          { scale: scaleValue },
          { translateY: translateYValue }
        ]
      }}
    >
      <MaterialCommunityIcons 
        name={focused ? focusedName : name} 
        color={color} 
        size={size} 
      />
    </Animated.View>
  );
};

export default AnimatedTabIcon;