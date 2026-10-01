import { defineStore } from "pinia";
import { computed, ref, watchEffect } from "vue";

import type { Course, Statement } from "~/types";
import { fetchCompleteCourse, fetchCourse } from "~/api/course";
import { useActiveCourseMap } from "~/composables/courses/activeCourse";
import { isAuthenticated } from "~/services/auth";
import { useMasteredElementsStore } from "~/store/masteredElements";
import { useStatement } from "./statement";

export const useCourseStore = defineStore("course", () => {
  const currentCourse = ref<Course>();
  const currentStatement = ref<Statement>([
  {
    "zh": "現代科技改變了人們的社交方式。",
    "en": "Modern technology has changed the way people socialize."
  },
  {
    "zh": "教育可以幫助年輕人獲得更好的工作機會。",
    "en": "Education can help young people get better job opportunities."
  },
  {
    "zh": "政府應該投入更多資金保護環境。",
    "en": "Governments should spend more money on environmental protection."
  },
  {
    "zh": "線上學習讓知識更容易取得。",
    "en": "Online learning makes knowledge more accessible."
  },
  {
    "zh": "運動有助於減輕日常生活的壓力。",
    "en": "Doing exercise helps reduce stress in daily life."
  },
  {
    "zh": "城市裡的空氣污染是一個嚴重的問題。",
    "en": "Air pollution in cities is a serious problem."
  },
  {
    "zh": "閱讀書籍可以拓展我們的視野。",
    "en": "Reading books can broaden our horizons."
  },
  {
    "zh": "旅遊能讓人認識不同的文化。",
    "en": "Travelling allows people to learn about different cultures."
  },
  {
    "zh": "人們過度依賴手機會影響人際關係。",
    "en": "Over-reliance on mobile phones affects interpersonal relationships."
  },
  {
    "zh": "均衡飲食對維持身體健康十分重要。",
    "en": "A balanced diet is very important for maintaining good health."
  }
]
);
  const { statementIndex, setupAutoSaveProgress } = useStatement();
  const masteredElementsStore = useMasteredElementsStore();

  const { updateActiveCourseMap } = useActiveCourseMap();

  watchEffect(() => {
    currentStatement.value = currentCourse.value?.statements[statementIndex.value];
  });

  const words = computed(() => {
    return currentStatement.value?.zh.split(" ") || [];
  });

  const visibleStatementsCount = computed(
    () => currentCourse.value?.statements.filter((s) => !s.isMastered).length || 0,
  );

  const visibleStatementIndex = computed(() => {
    let masteredCount = 0;
    currentCourse.value?.statements.forEach((statement, index) => {
      if (index < statementIndex.value) {
        if (statement.isMastered) {
          masteredCount++;
        }
      }
    });

    if (statementIndex.value - masteredCount >= visibleStatementsCount.value) {
      return statementIndex.value - masteredCount - 1;
    }

    return statementIndex.value - masteredCount;
  });

  const totalQuestionsCount = computed(() => {
    return currentCourse.value?.statements.length || 0;
  });

  function toSpecificStatement(index: number) {
    statementIndex.value = index;
  }

  function findNextUnmasteredIndex(currentIndex: number, direction: 1 | -1) {
    let index = currentIndex;
    while (index >= 0 && index < totalQuestionsCount.value) {
      index += direction;
      if (
        index >= 0 &&
        index < totalQuestionsCount.value &&
        !currentCourse.value!.statements[index].isMastered
      ) {
        return index;
      }
    }
    return -1; // 没有找到未掌握的元素
  }

  function toPreviousStatement() {
    const prevIndex = findNextUnmasteredIndex(statementIndex.value, -1);
    if (prevIndex !== -1) {
      statementIndex.value = prevIndex;
    }
  }

  function toNextStatement() {
    const nextIndex = findNextUnmasteredIndex(statementIndex.value, 1);
    if (nextIndex !== -1) {
      statementIndex.value = nextIndex;
    }
  }

  function resetStatementIndex() {
    const firstIndex = findFirstUnmasteredIndex();
    if (firstIndex !== -1) {
      statementIndex.value = firstIndex;
    }
  }

  function isAllDone() {
    return visibleStatementIndex.value >= visibleStatementsCount.value - 1;
  }

  function isLastStatement() {
    return visibleStatementIndex.value + 1 === visibleStatementsCount.value;
  }

  function isAllMastered() {
    return visibleStatementsCount.value === 0;
  }

  function updateMarketedStatements() {
    if (currentCourse.value) {
      currentCourse.value.statements = markMasteredElements(currentCourse.value.statements);
    }
  }

  function findFirstUnmasteredIndex() {
    if (!currentCourse.value) return 0;
    return currentCourse.value.statements.findIndex((statement) => !statement.isMastered);
  }

  function doAgain() {
    resetStatementIndex();
    updateActiveCourseMap(currentCourse.value?.coursePackId!, currentCourse.value?.id!);
  }

  async function completeCourse() {
    const coursePackId = currentCourse.value?.coursePackId!;
    const res = await fetchCompleteCourse(coursePackId, currentCourse.value?.id!);
    return res;
  }

  async function setup(coursePackId: string, courseId: string) {
    let course = await fetchCourse(coursePackId, courseId);

    course.statements = markMasteredElements(course.statements);

    currentCourse.value = course;
    if (isAuthenticated()) {
      setupAutoSaveProgress(currentCourse);
      if (statementIndex.value === 0) {
        resetStatementIndex();
      }
    }
  }

  function markMasteredElements(statements: Statement[]) {
    return statements.map((statement) => {
      const isMastered = masteredElementsStore.checkMastered(statement.english);

      return {
        ...statement,
        isMastered,
      };
    });
  }

  return {
    statementIndex,
    currentCourse,
    currentStatement,
    words,
    totalQuestionsCount,
    visibleStatementIndex,
    visibleStatementsCount,
    setup,
    doAgain,
    isAllDone,
    completeCourse,
    toSpecificStatement,
    toPreviousStatement,
    toNextStatement,
    resetStatementIndex,
    updateMarketedStatements,
    isLastStatement,
    isAllMastered,
  };
});
