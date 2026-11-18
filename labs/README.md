# إدارة مشروعات الذكاء الاصطناعي وفرق التسليم · المختبرات

أربعة مختبرات لمقرر أكاديمية سدايا **LDS-PRD-204**. المختبرات صفحات إرشادية بالعربية تُعمل في جدول بيانات ولوحة لتتبع العمل: الهدف، والملفات، والخطوات بدقائقها، وأسئلة تحقق، ومهمة إضافية ✱، وملاحظات للمدرّب. لا كود يكتبه المشارك، ولا نموذج لغوي يحتاجه أي مختبر.

كل المختبرات في جهة واحدة: **وزارة الشراكة المجتمعية** وخدمتها **غِربال** لمعالجة مستندات طلبات المنح. الوزارة والأشخاص والأرقام مخترعون، وكل الملفات مصنفة «عام». نتائج التقييم في الملفات صممها المقرر لتعطي نسبًا معروفة، وليست من تشغيل نموذج.

## ما يحتاجه المشارك

- جدول بيانات: LibreOffice Calc أو غيره. الدوال المستعملة: `AVERAGE` و`AVERAGEIFS` و`COUNTIF` و`IF` و`PERCENTILE.INC`.
- لوحة لتتبع العمل: لوحة مهام على مستودع Git، أو أي أداة Kanban؛ أو ورقة في الجدول إن لم تتوفر.
- مساعد ذكي للمختبرات 1.1 و1.2 و2.2.

## سياسة الذكاء الاصطناعي

| المستوى | أين |
|---|---|
| دون ذكاء اصطناعي | المختبر 2.1 كله (قرارات البوابات وتحديث السجل في وقت الجولة)، والاختبار القصير المراقب |
| مرشد | المختبران 1.1 و1.2: يراجع وينتقد ولا يكتب |
| كامل | المختبر 2.2: صياغة وثيقة التسليم، ويدافع عنها المشارك في المناقشة |

## نقطة البداية والحل

كل مختبر يبدأ من ملفات جاهزة ولا يحتاج نتيجة مختبر آخر. ملفات البداية كلها منشورة من اليوم الأول، وبعضها يكشف إجابة مختبر سابق: `approved_plan.csv` قريب من خطة 1.1، و`sim/start_risk_log.csv` سجل مرجعي لمختبر 1.2، وحزمة الجولة 3 تذكر قرار البوابة 2، و`final_state.md` يذكر قرار البوابة 3. لذلك لا يُقدَّر ما يكشفه ملف منشور قبل وقته؛ وما يُقدَّر في كل مختبر مذكور في قسم «التقييم» من README المقرر.

| المختبر | الصفحة | المدة | يبدأ من | الحل المرجعي |
|---|---|---|---|---|
| 1.1 | `D1_1_increments.html` | 90 دقيقة | `files/case_brief.md`، `files/feasibility_note.md`، `files/spike_fields.csv`، `files/spike_docs.csv` | `solutions/D1_1_increments.md` |
| 1.2 | `D1_2_team_estimates_risks.html` | 105 دقائق | `files/approved_plan.csv` (يوزَّع عند بدء المختبر)، `files/team.csv`، `files/raci_template.csv`، `files/reference_class.csv`، `files/backlog.csv`، `files/risk_signals.csv` | `solutions/D1_2_team_estimates_risks.md`، `solutions/raci_reference.csv` |
| 2.1 | `D2_1_simulation.html` | 120 دقيقة | `files/approved_plan.csv`، `files/sim/start_risk_log.csv`، وحزم الجولات الثلاث في `files/sim/` (توزَّع واحدة واحدة) | `solutions/D2_1_simulation.md` |
| 2.2 | `D2_2_handover.html` | 45 دقيقة | `files/final_state.md` (يوزَّع عند بدء المختبر)، `files/vendor_runbook_draft.md`، `files/handover_template.md`، `files/readiness_checklist.csv` | `solutions/D2_2_handover.md` |
| المشروع الختامي | شرائح `capstone` | 120 دقيقة | ملفات المختبرات الأربعة | `solutions/answer_key.md` |

## للمدرّب: المفتاح والأدوات

- `solutions/answer_key.md`: ما زُرع في الملفات وأي مختبر يكشفه، ومفتاح سلم المشروع الختامي.
- `solutions/key.json`: الأرقام المرجعية كلها، يكتبها المولّد.
- `solutions/check_all.mjs`: يتحقق أن المولّد يكتب البايتات نفسها، ويعيد حساب كل رقم مرجعي من ملفات CSV، ويتحقق أن ملفات Markdown تذكر الأرقام نفسها، ويقرأ القوالب الفارغة. يطبع PASS أو أول اختلاف.
- `_tools/verify_stats.mjs`: أرقام الأمثلة الموازية على الشرائح وفي بنك الأسئلة (خدمات أخرى في الوزارة، لا أرقام المختبرات).

الأدوات بلغة JavaScript ولا تحتاج غير Node 22 أو أحدث، وتُشغَّل من جذر المستودع:

```
node labs/_tools/prepare_files.mjs
node labs/solutions/check_all.mjs
node labs/_tools/verify_stats.mjs
```

الأول يعيد كتابة ملفات CSV في `files/` و`solutions/key.json` و`solutions/raci_reference.csv`؛ ومع `--check` لا يكتب شيئًا ويقارن فقط. ملفات Markdown في `files/` مكتوبة باليد، ويتحقق `check_all.mjs` من أرقامها.
