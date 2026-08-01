**BeautyFit**

Face Analysis → Rule-Based Style Recommendation Engine

工程规格文档 v1.0 — dlib 68-pt 参数计算 · 分类规则 · 风格评分矩阵 · 输出逻辑

本文档是 BeautyFit Face Analysis 功能的后端逻辑完整规格，覆盖从原始像素点到最终推荐输出的全链路 rule-based 决策体系。工程师可直接依照本文档转化为代码，无需额外研究资料。

**Step 1  dlib 68-pt 点位索引对照表**

输入：dlib face_landmarks 返回的68个(x,y)坐标点，索引从0开始。以下是各功能分组及其用于计算的指标。

| 功能分组 | dlib 68-pt 点位索引 | 用于计算的指标 |
| --- | --- | --- |
| 下颌轮廓 Jawline | pts[0] – pts[16]（共17点，左→右） | 脸高、颧宽、下颌宽、下颌角角度 |
| 右眉 Right Eyebrow | pts[17] – pts[21] | 眉间距、眉形走向 |
| 左眉 Left Eyebrow | pts[22] – pts[26] | 眉间距、眉形走向 |
| 鼻梁 Nose Bridge | pts[27] – pts[30] | 鼻梁高度（Z轴投影） |
| 鼻尖+鼻翼 Nose Tip & Alar | pts[31] – pts[35] | 鼻翼宽度、鼻尖形态 |
| 右眼 Right Eye | pts[36]内角, [37][38]上睑, [39]外角, [40][41]下睑 | 眼宽、眼高、倾斜角、开眼度 |
| 左眼 Left Eye | pts[42]内角, [43][44]上睑, [45]外角, [46][47]下睑 | 眼宽、眼高、倾斜角、开眼度 |
| 外唇廓 Outer Lip | pts[48]左角, [49][50]上唇左, [51]上唇中央(唇峰谷), [52][53]上唇右, [54]右角, [55][56]下唇右, [57]下唇中, [58][59]下唇左 | 唇宽、唇峰高度、上下唇厚比 |
| 内唇廓 Inner Lip | pts[60] – pts[67] | 唇部饱满度辅助验证 |

**Step 2  核心指标计算公式**

所有比率均为无量纲值（已归一化），与图片分辨率无关。face_height 是全局归一化基准。

*▸ 坐标系：x 从左到右增大，y 从上到下增大（图像坐标系）。*

*▸ eye_tilt_angle：正值 = 外角比内角低（下垂眼）；负值 = 外角比内角高（上扬眼）。*

*▸ lid_visibility 是近似估算，在 MVP 阶段建议结合 eye_height 双重验证单眼皮判断。*

| 指标名称 | 计算公式（基于pts坐标） | 含义说明 |
| --- | --- | --- |
| face_height | pts[8].y – pts[27].y （下巴最低点 – 鼻根点的Y轴距离，近似脸高） | 作为归一化基准，其他指标除以此值 |
| cheekbone_width | pts[16].x – pts[0].x（最宽处，下颌轮廓约pts[2]和pts[14]附近取max） 推荐：max_x(pts[1:16]) – min_x(pts[1:16]) | 颧骨宽度，脸型判断的核心基准 |
| face_ratio | face_height / cheekbone_width | 核心脸型比率： >1.6 长脸 \| 1.3-1.6 椭圆/心 \| 1.0-1.3 方/圆 \| <1.0 极圆 |
| forehead_width | pts[17].x (左眉头外侧) 到 pts[26].x (右眉头外侧) 精确法：取pts[0–16]中y值约在脸高30%处的x宽度 | 额头宽度 |
| forehead_ratio | forehead_width / cheekbone_width | >1.0 额头比颧骨宽（心形） 0.85-1.0 标准 <0.85 额头窄（菱形） |
| jaw_width | pts[4].x 到 pts[12].x（下颌转角处，约在脸高85%位置） | 下颌宽度 |
| jaw_ratio | cheekbone_width / jaw_width | >1.3 V脸/心形 \| 1.0-1.3 标准 \| <1.0 下宽梯形 |
| jaw_angle | angle( pts[4]→pts[6], pts[4]→pts[2] ) 即下颌角顶点pts[4]（右）和pts[12]（左）处的内角角度 | <115° 方脸/强颌 \| 115-130° 标准 \| >130° 圆脸/柔和 |
| chin_width | pts[6].x – pts[10].x（下颌最低段宽度，pts[7]-pts[9]范围） | 下巴形态： <0.15×cheekbone V形 \| >0.25×cheekbone 方下巴 |
| eye_width_R / L | R: pts[39].x – pts[36].x L: pts[45].x – pts[42].x | 眼裂水平宽度 |
| eye_height_R / L | R: max_y(pts[37],pts[38]) – min_y(pts[40],pts[41]) L: max_y(pts[43],pts[44]) – min_y(pts[46],pts[47]) | 眼裂垂直高度（睁眼程度） |
| eye_aspect_ratio | eye_width / eye_height（双眼平均值） | <2.2 圆眼 \| 2.2-3.2 杏仁 \| >3.2 细长眼 |
| eye_tilt_angle | atan2( outer_corner.y – inner_corner.y, outer_corner.x – inner_corner.x ) 双眼平均，角度制 | < -3° 上扬眼(猫眼) \| -3° to 3° 水平 \| >3° 下垂眼 |
| eye_spacing_ratio | ( pts[42].x – pts[39].x ) / cheekbone_width | <0.28 眼距近 \| 0.28-0.36 标准 \| >0.36 眼距宽 |
| lid_visibility （眼皮可见度） | eye_height / 眉毛到睫毛线距离 = eye_height_R / (pts[19].y – pts[38].y) （近似：眉心到上睑距离） | >0.6 双眼皮可见 \| 0.3-0.6 轻微遮盖 \| <0.3 hooded/单眼皮 注：需结合 eye_height 综合判断 |
| nose_bridge_height | ( pts[27].y – pts[30].y ) 的投影比 = (pts[30].y – pts[27].y) / face_height | <0.05 低鼻梁 \| 0.05-0.08 标准 \| >0.08 高鼻梁 （注：2D照片鼻梁高度用鼻根下陷深度近似） |
| alar_width_ratio | ( pts[35].x – pts[31].x ) / cheekbone_width | <0.28 窄鼻翼 \| 0.28-0.36 标准 \| >0.36 宽鼻翼 |
| lip_width_ratio | ( pts[54].x – pts[48].x ) / cheekbone_width | <0.30 小嘴/窄唇 \| 0.30-0.40 标准 \| >0.40 宽唇 |
| lip_height_ratio | ( pts[57].y – pts[51].y ) / face_height | <0.025 薄唇 \| 0.025-0.04 标准 \| >0.04 厚唇 |
| cupid_bow_ratio （唇峰明显度） | 上唇中央最高点下凹幅度： = ( pts[50].y + pts[52].y )/2 – pts[51].y ) / lip_height （唇峰两侧高于中央谷值 → 正值=唇峰明显） | >0.25 唇峰明显（M唇）\| 0.1-0.25 一般 \| <0.1 平唇 注：pts[51]为上唇弓中点，越低则唇峰越凹 |

**Step 3  分类规则（Classification Rules）**

**3.1  脸型分类（单选，按顺序匹配，第一个满足条件即输出）**

输出：face_shape ∈ { OVAL, ROUND, SQUARE, HEART, OBLONG, DIAMOND }

*▸ 规则优先级顺序很重要：OBLONG→HEART→DIAMOND→SQUARE→ROUND→OVAL（最后一个是默认兜底）*

| 脸型输出标签 | Rule 判断条件（按优先级顺序，第一个匹配即输出） |
| --- | --- |
| OBLONG 长形脸 | face_ratio > 1.55  AND  jaw_ratio >= 1.1  AND  jaw_angle > 118° → 脸明显长于宽，颌线不方 |
| HEART 心形脸 | forehead_ratio > 1.02  AND  jaw_ratio > 1.25  AND  chin_width < 0.18×cheekbone → 额头最宽，下巴V尖 |
| DIAMOND 菱形脸 | forehead_ratio < 0.87  AND  jaw_ratio < 0.90  AND  face_ratio >= 1.25 → 颧骨最宽，额窄颌也窄 |
| SQUARE 方脸 | jaw_angle < 118°  AND  jaw_ratio >= 0.92  AND  face_ratio < 1.4 → 下颌角锐且颧/颌宽度接近 |
| ROUND 圆脸 | face_ratio < 1.22  AND  jaw_angle > 125°  AND  chin_width > 0.20×cheekbone → 脸宽接近脸高，下颌圆润无棱角 |
| OVAL 椭圆脸 | 1.25 <= face_ratio <= 1.55  AND  jaw_ratio >= 1.10  AND  jaw_angle >= 118° → 以上均不匹配时的默认项；也是最常见分类 |

**3.2  眼型分类（多标签并行，多个标签可同时为 true）**

输出：eye_tags ⊆ { MONOLID, HOODED, DOUBLE_LID, UPTURNED, DOWNTURNED, ROUND_EYE, ALMOND_EYE, WIDE_SET, CLOSE_SET }

*▸ MONOLID 和 HOODED 互斥；DOUBLE_LID 为排除前两者后的默认值。*

*▸ UPTURNED / DOWNTURNED / ALMOND 基于 eye_tilt_angle 三选一。ROUND_EYE 独立判断。WIDE_SET / CLOSE_SET 独立判断。*

| 眼型输出标签 | Rule 判断条件（多标签并行输出，不互斥） |
| --- | --- |
| MONOLID 单眼皮 | lid_visibility < 0.30  AND  eye_height < 0.055×face_height → 眼皮平坦，褶皱不可见（常见东亚面孔） |
| HOODED 下垂眼皮 | lid_visibility < 0.35  AND  eye_height >= 0.055×face_height → 有一定眼高但眉骨皮肤下垂遮盖眼皮 |
| DOUBLE_LID 双眼皮 | lid_visibility >= 0.40 → 眼皮褶皱可见（非单眼皮且非hooded） |
| UPTURNED 上扬眼 | eye_tilt_angle < -4° → 外眼角高于内眼角，天然猫眼感 |
| DOWNTURNED 下垂眼角 | eye_tilt_angle > +4° → 外眼角低于内眼角，眼神温柔 |
| ROUND_EYE 圆眼 | eye_aspect_ratio < 2.3 → 眼形接近圆形，开阔感强 |
| ALMOND_EYE 杏仁眼 | 2.3 <= eye_aspect_ratio <= 3.2  AND  -4° <= eye_tilt <= +4° → 长宽比例均衡，是最versatile眼型 |
| WIDE_SET 眼距宽 | eye_spacing_ratio > 0.36 → 两眼间距大，视觉重心偏外 |
| CLOSE_SET 眼距近 | eye_spacing_ratio < 0.28 → 两眼靠近，视觉重心偏内 |

**3.3  鼻部 & 唇部分类（独立多标签）**

输出：facial_tags ⊆ { LOW_NOSE_BRIDGE, HIGH_NOSE_BRIDGE, WIDE_ALAR, NARROW_ALAR, THIN_LIP, FULL_LIP, DEFINED_BOW, FLAT_BOW, WIDE_LIP, SMALL_MOUTH }

*▸ 鼻梁高度：LOW / STANDARD / HIGH 三选一。鼻翼：WIDE / STANDARD / NARROW 三选一。*

*▸ 唇高：THIN / STANDARD / FULL 三选一。唇峰：DEFINED / STANDARD / FLAT 三选一。唇宽：WIDE / STANDARD / SMALL 三选一。*

| 鼻/唇输出标签 | Rule 判断条件 |
| --- | --- |
| LOW_NOSE_BRIDGE 低鼻梁 | nose_bridge_height < 0.052 |
| HIGH_NOSE_BRIDGE 高鼻梁 | nose_bridge_height > 0.075 |
| WIDE_ALAR 宽鼻翼 | alar_width_ratio > 0.365 |
| NARROW_ALAR 窄鼻翼 | alar_width_ratio < 0.280 |
| THIN_LIP 薄唇 | lip_height_ratio < 0.026 |
| FULL_LIP 厚唇 | lip_height_ratio > 0.042 |
| DEFINED_BOW 唇峰明显 | cupid_bow_ratio > 0.22 |
| FLAT_BOW 平唇/唇峰不明显 | cupid_bow_ratio < 0.10 |
| WIDE_LIP 宽唇 | lip_width_ratio > 0.40 |
| SMALL_MOUTH 小嘴 | lip_width_ratio < 0.30 |

**Step 4  风格评分矩阵（Scoring Matrix）**

**输出数据结构（JSON示例）**

{

"face_shape": "ROUND",

"eye_tags": ["MONOLID", "ROUND_EYE", "WIDE_SET"],

"facial_tags": ["LOW_NOSE_BRIDGE", "THIN_LIP", "DEFINED_BOW"],

"style_scores": {

"sweet": 87,   "elegant": 84,   "natural": 81,

"sexy": 50, " Androgynous ": 40, "powerful": 40 },

"recommendations": [

{ "style": "korean",  "score": 87, "match": "STRONG" },

{ "style": "elegant",  "score": 84, "match": "STRONG" },

{ "style": "natural", "score": 81, "match": "STRONG" }

]

}

前端收到 recommendations 数组后，依照 style 字段查询预置的妆容描述文案库，组合"你的脸型特征"+ "为什么适合这个风格"+ "关键步骤提示"三段文字，呈现给用户。

*▸ 文案库结构建议：每个风格 × 每个关键五官标签组合 → 预置1-2句个性化说明（例如：单眼皮+韩系→'内眼角高光对你的眼型效果特别明显'）*

*▸ 调优：MVP上线后收集用户对推荐结果的满意度反馈（👍/👎），用于迭代修正各标签的分值权重。*