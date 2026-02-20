import React, { useState, useMemo } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { ThemedText } from '@/components/ThemedText';
import { FontAwesome6 } from '@expo/vector-icons';
import { createStyles } from './styles';

interface CalendarViewProps {
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  markedDates?: string[];  // 有复习计划的日期，格式为 YYYY-MM-DD
}

export function CalendarView({ selectedDate, onDateSelect, markedDates = [] }: CalendarViewProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  const [currentDate, setCurrentDate] = useState(new Date());

  // 获取当月信息
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // 当月第一天
    const firstDay = new Date(year, month, 1);
    // 当月最后一天
    const lastDay = new Date(year, month + 1, 0);
    // 当月总天数
    const daysInMonth = lastDay.getDate();
    // 第一天是星期几（0-6，0 是周日）
    const firstDayOfWeek = firstDay.getDay();
    
    // 星期名称
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    
    // 生成日历网格
    const days = [];
    
    // 填充月初空白
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push({ day: null, date: null });
    }
    
    // 填充日期
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split('T')[0];
      days.push({
        day,
        date,
        dateStr,
        isMarked: markedDates.includes(dateStr),
        isSelected: selectedDate && dateStr === selectedDate.toISOString().split('T')[0],
        isToday: dateStr === new Date().toISOString().split('T')[0],
      });
    }
    
    return {
      year,
      month,
      daysInMonth,
      weekDays,
      days,
    };
  }, [currentDate, selectedDate, markedDates]);

  // 切换月份
  const changeMonth = (delta: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentDate(newDate);
  };

  // 选择日期
  const handleDateSelect = (date: Date) => {
    if (onDateSelect) {
      onDateSelect(date);
    }
  };

  // 判断日期是否在过去
  const isPastDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  };

  return (
    <View style={styles.container}>
      {/* 月份导航 */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.navButton} 
          onPress={() => changeMonth(-1)}
        >
          <FontAwesome6 name="chevron-left" size={20} color={theme.textPrimary} />
        </TouchableOpacity>
        
        <View style={styles.monthYear}>
          <ThemedText variant="h4" color={theme.textPrimary}>
            {calendarData.year}年{calendarData.month + 1}月
          </ThemedText>
        </View>
        
        <TouchableOpacity 
          style={styles.navButton} 
          onPress={() => changeMonth(1)}
        >
          <FontAwesome6 name="chevron-right" size={20} color={theme.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* 星期标题 */}
      <View style={styles.weekDays}>
        {calendarData.weekDays.map((day, index) => (
          <View key={index} style={styles.weekDayCell}>
            <ThemedText variant="caption" color={theme.textMuted}>
              {day}
            </ThemedText>
          </View>
        ))}
      </View>

      {/* 日历网格 */}
      <View style={styles.daysGrid}>
        {calendarData.days.map((dayInfo, index) => {
          if (!dayInfo.date) {
            return <View key={index} style={styles.emptyCell} />;
          }

          const { day, date, dateStr, isMarked, isSelected, isToday } = dayInfo;
          const pastDate = isPastDate(date);

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.dayCell,
                isSelected && styles.dayCellSelected,
                pastDate && styles.dayCellPast,
              ]}
              onPress={() => !pastDate && handleDateSelect(date)}
              disabled={pastDate}
            >
              <View style={styles.dayContent}>
                <ThemedText
                  variant="body"
                  color={
                    isSelected
                      ? theme.buttonPrimaryText
                      : isToday
                      ? theme.primary
                      : pastDate
                      ? theme.textMuted
                      : theme.textPrimary
                  }
                  style={[
                    styles.dayText,
                    isToday && styles.dayTextToday,
                  ]}
                >
                  {day}
                </ThemedText>

                {/* 标记点 */}
                {isMarked && (
                  <View
                    style={[
                      styles.markDot,
                      isSelected && styles.markDotSelected,
                    ]}
                  />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
