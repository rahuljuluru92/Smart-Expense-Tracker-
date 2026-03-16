'use client'

import { motion } from 'framer-motion'
import { Award, Lock } from 'lucide-react'
import { Achievement } from '@/types/auth'

interface AchievementBadgeProps {
  achievement: Achievement
}

export function AchievementBadge({ achievement }: AchievementBadgeProps) {
  const isUnlocked = achievement.unlockedAt !== undefined
  const progressPercentage = (achievement.progress / achievement.maxProgress) * 100

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      className={`relative p-4 rounded-lg border transition-all duration-200 ${
        isUnlocked 
          ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200' 
          : 'bg-gray-50 border-gray-200'
      }`}
    >
      <div className="flex items-center space-x-3">
        {/* Achievement Icon */}
        <div className={`relative w-12 h-12 rounded-full flex items-center justify-center ${
          isUnlocked 
            ? 'bg-gradient-to-r from-yellow-400 to-orange-500' 
            : 'bg-gray-300'
        }`}>
          {isUnlocked ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            >
              <Award className="w-6 h-6 text-white" />
            </motion.div>
          ) : (
            <Lock className="w-6 h-6 text-gray-500" />
          )}
        </div>

        {/* Achievement Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className={`text-sm font-semibold truncate ${
              isUnlocked ? 'text-gray-900' : 'text-gray-600'
            }`}>
              {achievement.name}
            </h4>
            {isUnlocked && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-xs text-green-600 font-medium"
              >
                Unlocked!
              </motion.span>
            )}
          </div>
          
          <p className={`text-xs mb-2 ${
            isUnlocked ? 'text-gray-600' : 'text-gray-500'
          }`}>
            {achievement.description}
          </p>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className={`h-2 rounded-full ${
                isUnlocked 
                  ? 'bg-gradient-to-r from-yellow-400 to-orange-500' 
                  : 'bg-gray-400'
              }`}
            />
          </div>
          
          <div className="flex justify-between mt-1">
            <span className="text-xs text-gray-500">
              {achievement.progress} / {achievement.maxProgress}
            </span>
            <span className="text-xs text-gray-500">
              {Math.round(progressPercentage)}%
            </span>
          </div>
        </div>
      </div>

      {/* Unlock Animation */}
      {isUnlocked && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
          className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center"
        >
          <span className="text-white text-xs">✓</span>
        </motion.div>
      )}

      {/* Sparkle Effect for Unlocked Achievements */}
      {isUnlocked && (
        <>
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="absolute -top-1 -left-1 w-2 h-2 bg-yellow-400 rounded-full"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            className="absolute -bottom-1 -right-1 w-1.5 h-1.5 bg-orange-400 rounded-full"
          />
        </>
      )}
    </motion.div>
  )
}
