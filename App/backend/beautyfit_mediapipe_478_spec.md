**BeautyFit**

**Face Analysis — MediaPipe 478-Point Metric Specification**

*工程规格文档 v2.0  ·  MediaPipe Face Mesh (refine_landmarks=True)  ·  478-pt 3D 坐标*

# **0. 文档说明与设计原则**

本文档完整定义 BeautyFit Face Analysis 后端从 MediaPipe Face Mesh 478 个归一化 3D 坐标点出发，到最终脸型/五官分类输出的全链路规则。相比 dlib 68-pt 版本，MediaPipe 提供以下关键优势：

*▸ 坐标归一化：x, y ∈ [0, 1]（按图像宽高归一化），z 为相对深度，以脸宽为单位缩放，closer = 更负（或更小值取决于 API 版本）。*

*▸ 密度更高：478 点中轮廓点覆盖额顶（pt10）、下巴（pt152）、完整脸廓 silhouette（36 点），使 face_height 的计算从「下半脸高」升级为「全脸高」。*

*▸ 3D 深度可用：z 坐标可辅助计算鼻梁高度，弥补 dlib 2D 版本的核心缺陷。*

*▸ 虹膜点（468–477）：refine_landmarks=True 时额外提供 10 个虹膜点，可用于更精确的眼距/眼型计算。*

*▸ 坐标系：x 从左到右增大，y 从上到下增大（图像坐标系），z 越负 = 越靠近相机（归一化空间中相对脸中心）。*

# **Step 1 — 关键点位索引对照表（MediaPipe 478-pt）**

以下是各功能分组的官方索引来源，参考自 TensorFlow.js Face Landmarks Detection keypoints.ts、MediaPipe Python FACEMESH_* 连接组，以及 simplified_mediapipe_face_landmarks 开源项目（k-m-irfan）的实测结果。

## **1.1 脸廓轮廓 Silhouette（完整脸形基准）**

| 分组 | 点位索引（顺序：顶→右→下→左） | 用途 |
| --- | --- | --- |
| Silhouette（完整36点） | 10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109 | 脸廓宽度（颧、额、颌各处）、脸高 |
| 额顶 Forehead Top | 10 | face_height 上基准点（真实额顶） |
| 下巴最低 Chin Bottom | 152 | face_height 下基准点 |
| 右脸最宽 Cheek R | 454 | 脸廓最宽点（右） |
| 左脸最宽 Cheek L | 234 | 脸廓最宽点（左） |
| 右颌角 Jaw R | 365 / 397 | 下颌角转折区（右侧） |
| 左颌角 Jaw L | 136 / 172 | 下颌角转折区（左侧） |
| 下巴左右侧 Chin sides | 377, 400 / 148, 176 | chin_width 计算用 |

## **1.2 眉毛 Eyebrows**

| 分组 | 点位索引 | 用途 |
| --- | --- | --- |
| 右眉 Right Eyebrow（内→外） | 70, 63, 105, 66, 107, 55, 65, 52, 53, 46 | 额宽测量、眉形走向 |
| 左眉 Left Eyebrow（内→外） | 300, 293, 334, 296, 336, 285, 295, 282, 283, 276 | 额宽测量、眉形走向 |
| 右眉内端（靠近鼻子） | 46 | forehead 右侧锚点 |
| 左眉内端（靠近鼻子） | 276 | forehead 左侧锚点 |
| 右眉外端 | 70 | forehead 外侧宽度 |
| 左眉外端 | 300 | forehead 外侧宽度 |

## **1.3 眼睛 Eyes（含 EAR 六点组合）**

| 分组 | 点位索引 | 用途 |
| --- | --- | --- |
| 右眼完整轮廓 | 33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246 | 眼形、眼开度 |
| 左眼完整轮廓 | 362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398 | 眼形、眼开度 |
| 右眼 EAR 六点组合 | 33(外角), 159(上睑顶), 158(上睑次), 133(内角), 153(下睑次), 145(下睑底) | EAR 标准公式（Soukupová & Čech 2016） |
| 左眼 EAR 六点组合 | 263(外角), 386(上睑顶), 385(上睑次), 362(内角), 380(下睑次), 374(下睑底) | EAR 标准公式 |
| 右眼内/外角 | 133(内), 33(外) | eye_tilt_angle |
| 左眼内/外角 | 362(内), 263(外) | eye_tilt_angle |
| 右虹膜中心 | 468 | 精确瞳孔中心，用于眼距 |
| 左虹膜中心 | 473 | 精确瞳孔中心，用于眼距 |
| 右眉中心（lid_visibility 分母） | 105（右眉峰附近） | eyebrow-to-lid 距离 |
| 左眉中心（lid_visibility 分母） | 334（左眉峰附近） | eyebrow-to-lid 距离 |

## **1.4 鼻梁 & 鼻翼 Nose**

| 分组 | 点位索引 | 用途 |
| --- | --- | --- |
| 鼻根 Nose Root | 168 | 鼻梁最高点（额鼻交界），替代 dlib pt27 |
| 鼻尖 Nose Tip | 1 | 鼻尖，官方确认最低点 |
| 鼻梁中点 | 6 | 辅助鼻梁曲率 |
| 鼻翼左端 | 129 | alar_width 左侧 |
| 鼻翼右端 | 358 | alar_width 右侧 |
| 鼻底中点 | 2 | 鼻尖形态辅助 |

## **1.5 嘴唇 Lips**

| 分组 | 点位索引 | 用途 |
| --- | --- | --- |
| 外唇上缘（左→中→右） | 61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291 | 上唇形态 |
| 外唇下缘 | 146, 91, 181, 84, 17, 314, 405, 321, 375, 291 | 下唇形态 |
| 唇角左/右 | 61（左）, 291（右） | lip_width |
| 上唇中央最高点（唇珠谷） | 0 | cupid_bow_ratio 分子 |
| 上唇弓两侧峰（左/右） | 37, 267 | cupid_bow_ratio 分子两侧 |
| 下唇最低点 | 17 | lip_height_ratio 分母 |
| 内唇上/下中心 | 13（上）, 14（下） | 实际唇高开口度 |

# **Step 2 — 核心指标计算公式（修订版）**

所有比率为无量纲值，与图像分辨率无关。lm[i] 表示第 i 个归一化 landmark，.x/.y/.z 分别为对应坐标分量。

*▸ face_height 现定义为 lm[152].y – lm[10].y（下巴到额顶），覆盖全脸，修正了 dlib 版只含下半脸的核心缺陷。*

*▸ cheekbone_width 使用 silhouette 36 点中的 max_x – min_x，比 dlib 的颌骨最宽点更准确。*

*▸ 3D 深度 z 用于鼻梁高度计算，弥补 2D 投影的根本局限。*

| 指标名称 | 计算公式 | 含义说明 |
| --- | --- | --- |
| face_height | lm[152].y – lm[10].y  （下巴最低点 → 额顶） | 全脸高度，归一化基准。修正了 dlib 版用鼻根的错误 |
| cheekbone_width | max_x(silhouette) – min_x(silhouette)  即 silhouette 36 点中最宽处 | 颧骨/脸廓最宽宽度。直接来自轮廓点，比颌骨点更可靠 |
| face_ratio | face_height / cheekbone_width | >1.55 长形脸 │ 1.30–1.55 椭圆/心 │ 1.10–1.30 方/圆边界 │ <1.10 极圆 |
| forehead_width | lm[70].x – lm[300].x  （右眉外端 → 左眉外端水平距离） | 眉外侧间距近似额宽（比眉内侧更宽，更接近真实额部宽度） |
| forehead_ratio | forehead_width / cheekbone_width | >1.0 额宽 ≥ 颧骨（心形候选）│ 0.85–1.0 标准 │ <0.85 额窄（菱形候选） |
| jaw_width | lm[365].x – lm[172].x  （右颌角 → 左颌角，y ≈ 80–85% face_height 处） | 下颌角间距。MediaPipe 365/172 对应颌骨转角，比 dlib pt4/12 更准确 |
| jaw_ratio | cheekbone_width / jaw_width | >1.25 V脸/心形 │ 1.0–1.25 标准 │ <1.0 下宽梯形 |
| jaw_angle | angle(lm[365]→lm[152], lm[365]→lm[397])  左侧同理取 lm[136]→lm[152], lm[136]→lm[172]  取左右平均值 | 下颌角内角。<115° 方脸 │ 115–128° 标准 │ >128° 圆润 |
| chin_width | lm[400].x – lm[176].x  （下巴最低段左右宽度，y ≈ 95% face_height） | <0.15×cheek V形尖下巴 │ >0.25×cheek 方下巴 |
| EAR 眼开度 | EAR_R = (‖p159-p145‖ + ‖p158-p153‖) / (2 × ‖p33-p133‖)  EAR_L = (‖p386-p374‖ + ‖p385-p380‖) / (2 × ‖p263-p362‖)  EAR = (EAR_R + EAR_L) / 2 | Soukupová & Čech 2016 标准 6-point EAR 公式。<0.20 闭眼/单眼皮 │ 0.20–0.28 正常 │ >0.28 大眼 |
| eye_width_R/L | R: ‖lm[33] – lm[133]‖  L: ‖lm[263] – lm[362]‖ | 水平眼裂宽度（内外角欧式距离） |
| eye_height_R/L | R: max_y(159,158) – min_y(145,153)  L: max_y(386,385) – min_y(374,380) | 垂直眼裂高度 |
| eye_aspect_ratio | eye_width / eye_height（双眼平均） | <2.2 圆眼 │ 2.2–3.2 杏仁眼 │ >3.2 细长眼 |
| eye_tilt_angle | R: atan2(lm[33].y – lm[133].y, lm[33].x – lm[133].x)  L: atan2(lm[263].y – lm[362].y, lm[263].x – lm[362].x)  取双眼平均，转为角度 | < –4° 上扬眼（外角高）│ –4° ~ +4° 水平 │ > +4° 下垂眼（外角低） |
| eye_spacing_ratio | (lm[473].x – lm[468].x) / cheekbone_width  （使用虹膜中心点，比内眼角更精确） | <0.28 眼距近 │ 0.28–0.36 标准 │ >0.36 眼距宽 |
| lid_visibility（眼皮可见度） | R: eye_height_R / max(lm[105].y – lm[159].y, face_height×0.02)  L: eye_height_L / max(lm[334].y – lm[386].y, face_height×0.02)  分母加 guard 防除以零 | >0.55 双眼皮明显 │ 0.30–0.55 轻微遮盖 │ <0.30 hooded/单眼皮 |
| nose_bridge_height（3D） | depth_diff = lm[168].z – lm[6].z  （鼻根 z 深度 – 鼻梁中点 z 深度）  nose_bridge_height = depth_diff / face_height（近似比） | 利用 MediaPipe z 坐标（越负越靠相机）估算鼻梁立体高度。<0.01 低鼻梁 │ 0.01–0.025 标准 │ >0.025 高鼻梁 |
| alar_width_ratio | ‖lm[129] – lm[358]‖ / cheekbone_width  （鼻翼左端 → 右端欧式距离） | <0.28 窄鼻翼 │ 0.28–0.36 标准 │ >0.36 宽鼻翼 |
| lip_width_ratio | ‖lm[61] – lm[291]‖ / cheekbone_width  （唇角左 → 右欧式距离） | <0.30 小嘴 │ 0.30–0.40 标准 │ >0.40 宽唇 |
| lip_height_ratio | (lm[17].y – lm[0].y) / face_height  （下唇最低 → 上唇中央） | <0.025 薄唇 │ 0.025–0.040 标准 │ >0.040 厚唇 |
| cupid_bow_ratio（唇峰明显度） | peak_avg = (lm[37].y + lm[267].y) / 2  cupid_bow_ratio = (peak_avg – lm[0].y) / lip_height_raw  lip_height_raw = lm[17].y – lm[0].y  注：y 向下增大，唇峰处 37/267 的 y 小于谷点 0 → 正值=唇峰明显 | >0.20 唇峰明显（M唇）│ 0.08–0.20 一般 │ <0.08 平唇。修正了 dlib 版公式方向颠倒的 bug |

# **Step 3 — 分类规则（修订版 Classification Rules）**

## **3.1 脸型分类（单选，优先级顺序匹配）**

输出：face_shape ∈ { OVAL, ROUND, SQUARE, HEART, OBLONG, DIAMOND }

*▸ 优先级顺序：OBLONG → HEART → DIAMOND → SQUARE → ROUND → OVAL（无条件兜底）*

*▸ OVAL 作为最后的无条件兜底，不设 face_ratio 下限，确保所有情况均有输出，消除 dlib 版的 gap 问题。*

| 脸型输出标签 | 判断条件 | 修订说明 |
| --- | --- | --- |
| OBLONG 长形脸 | face_ratio > 1.55   AND   jaw_ratio >= 1.10   AND   jaw_angle > 118° | 与 dlib 版基本一致，阈值在全脸 face_height 下已合理 |
| HEART 心形脸 | forehead_ratio > 0.95   AND   jaw_ratio > 1.22   AND   chin_width < 0.17×cheekbone | forehead_ratio 阈值从 1.02 降至 0.95（修正 dlib 版额宽计算偏低导致心形永远无法触发的 bug） |
| DIAMOND 菱形脸 | forehead_ratio < 0.88   AND   jaw_ratio < 0.92   AND   face_ratio >= 1.25 | 额窄且颌也窄、颧骨最宽。forehead_ratio 阈值略调整 |
| SQUARE 方脸 | jaw_angle < 118°   AND   jaw_ratio >= 0.90   AND   face_ratio < 1.40 | 颌角锐（<118°）且颧/颌宽度接近，无圆润感 |
| ROUND 圆脸 | face_ratio < 1.15   AND   jaw_angle > 128°   AND   chin_width > 0.22×cheekbone | face_ratio 阈值从 1.22 收紧至 1.15，jaw_angle 从 125° 提高至 128°，chin_width 从 0.20 提至 0.22，三者同步收紧防止误判（Image 1/2/3 的核心修复） |
| OVAL 椭圆脸（兜底） | 不满足以上任何条件则输出 OVAL（无条件兜底，不设 face_ratio 范围限制） | 消除 dlib 版 1.22–1.25 区间的 gap 问题。OVAL 是最常见分类，兜底合理 |

## **3.2 眼型分类（多标签并行）**

输出：eye_tags ⊆ { MONOLID, HOODED, DOUBLE_LID, UPTURNED, DOWNTURNED, ALMOND_EYE, ROUND_EYE, WIDE_SET, CLOSE_SET }

*▸ MONOLID / HOODED / DOUBLE_LID 三选一（互斥，按优先级顺序）。*

*▸ UPTURNED / ALMOND / DOWNTURNED 三选一（基于 eye_tilt_angle，使用开区间消除边界同时触发问题）。*

*▸ ROUND_EYE 与上组可共存（单独判断 EAR）。WIDE_SET / CLOSE_SET 独立判断。*

| 眼型标签 | 判断条件 | 修订说明 |
| --- | --- | --- |
| MONOLID 单眼皮 | EAR < 0.20   AND   lid_visibility < 0.30 | 改用 EAR 替代 dlib 版 eye_height 绝对值，消除分辨率依赖。EAR < 0.20 对应眼裂极小 |
| HOODED 下垂眼皮 | EAR >= 0.20   AND   lid_visibility < 0.32 | 与 MONOLID 互斥（EAR 分支）。有一定眼高但眉骨皮肤下垂遮盖眼皮折痕 |
| DOUBLE_LID 双眼皮 | lid_visibility >= 0.40 | 在 MONOLID/HOODED 均不满足后的默认值，加入 0.32–0.40 的缓冲死区防止边界跳变 |
| UPTURNED 上扬眼 | eye_tilt_angle < –4°（严格小于） | 外眼角高于内眼角。使用严格不等号，消除 ±4° 边界同时触发问题 |
| ALMOND_EYE 杏仁眼 | 2.2 < eye_aspect_ratio < 3.2   AND   –4° < eye_tilt < +4°（双侧开区间） | eye_aspect_ratio 加入 2.2–2.4 缓冲死区（2.2 < x 而非 ≥ 2.2），防止与 ROUND_EYE 跳变 |
| DOWNTURNED 下垂眼角 | eye_tilt_angle > +4°（严格大于） | 外眼角低于内眼角，眼神温柔感 |
| ROUND_EYE 圆眼 | EAR > 0.28  OR  eye_aspect_ratio < 2.2 | 两个条件任一满足即可（EAR 高 = 眼睛开度大；aspect_ratio 低 = 眼形接近圆形） |
| WIDE_SET 眼距宽 | eye_spacing_ratio > 0.36 | 使用虹膜中心（468/473）替代内眼角，更精确 |
| CLOSE_SET 眼距近 | eye_spacing_ratio < 0.28 | 同上 |

## **3.3 鼻部 & 唇部分类**

输出标签集：facial_tags ⊆ { LOW_NOSE_BRIDGE, HIGH_NOSE_BRIDGE, WIDE_ALAR, NARROW_ALAR, THIN_LIP, FULL_LIP, DEFINED_BOW, FLAT_BOW, WIDE_LIP, SMALL_MOUTH }

*▸ 鼻梁高度现使用 z 坐标差值，是对 dlib 2D 版的根本性改进。*

*▸ cupid_bow_ratio 公式方向已修正（dlib 版存在方向颠倒的 bug）。*

| 输出标签 | 判断条件 | 修订说明 |
| --- | --- | --- |
| LOW_NOSE_BRIDGE | nose_bridge_height < 0.010 | 3D z 差值阈值。对低鼻梁亚裔面孔更准确 |
| HIGH_NOSE_BRIDGE | nose_bridge_height > 0.025 | z 差值显著，鼻梁高挺 |
| WIDE_ALAR | alar_width_ratio > 0.360 | 使用欧式距离替代简单 x 差值，消除轻微角度偏转的影响 |
| NARROW_ALAR | alar_width_ratio < 0.280 | 同上 |
| THIN_LIP | lip_height_ratio < 0.025 | 阈值与 face_height 全脸高同步调整 |
| FULL_LIP | lip_height_ratio > 0.042 | 同上 |
| DEFINED_BOW（唇峰明显） | cupid_bow_ratio > 0.20 | 修正后公式：正值=唇峰明显（M唇），dlib 版正负方向相反 |
| FLAT_BOW（平唇） | cupid_bow_ratio < 0.08 | 唇弓几乎平坦 |
| WIDE_LIP | lip_width_ratio > 0.40 | 欧式距离计算 |
| SMALL_MOUTH | lip_width_ratio < 0.30 | 欧式距离计算 |

# **Step 4 — 实现注意事项 & 稳健性设计**

## **4.1 MediaPipe 坐标系说明**

| 坐标 | 范围 | 说明 |
| --- | --- | --- |
| x | 0.0 – 1.0 | 归一化图像 x（左→右），乘以 image_width 得像素坐标 |
| y | 0.0 – 1.0 | 归一化图像 y（上→下），乘以 image_height 得像素坐标 |
| z | 负值（靠相机）~ 正值（远离） | 以 x 轴为单位缩放的相对深度，越负越靠近相机。计算欧式距离时建议将 x/y 乘以 image_width/height 转为像素再计算，z 按比例处理 |

## **4.2 稳健性设计要求**

| 场景 | 处理方式 | 说明 |
| --- | --- | --- |
| lid_visibility 分母为零 | max(lm[105].y – lm[159].y, face_height×0.02) | 防止眉毛与眼睑重合时除以零，0.02 的 guard 约对应 2% 脸高 |
| eye_tilt_angle 边界 ±4° | 使用严格不等号 < 和 >，中间值归入 ALMOND | 消除 dlib 版 ≤ vs < 不一致导致的边界重叠 |
| ROUND 与 OVAL 之间的 gap | OVAL 改为无条件兜底，移除 face_ratio 下限 | 消除 1.22–1.25 gap，保证任何输入都有输出 |
| 侧脸/遮挡 | 检查 silhouette 点位置对称性：max_x+min_x 应接近 0.5。偏差 >0.1 时提示重拍 | 侧脸会导致 cheekbone_width 显著偏小，所有 ratio 系统性偏移 |
| 极短/宽脸（罕见情况） | face_ratio < 0.8 或 > 2.0 时输出置信度标记 LOW_CONFIDENCE | 超出正常人脸比例，可能是角度问题 |
| z 坐标质量差（极端角度） | 鼻梁高度同时结合 2D 投影辅助验证：若 alar_width_ratio < 0.25 且无 LOW_NOSE_BRIDGE，触发警告 | z 坐标在非正面时可靠性下降 |

## **4.3 亚裔面孔专项校准建议**

BeautyFit 核心差异化是服务亚裔等非欧美用户。以下阈值在亚裔样本上需特别关注：

| 指标 | 亚裔面孔特征 | 校准建议 |
| --- | --- | --- |
| MONOLID 判定 | 单眼皮比例高，lid_visibility 普遍较低 | EAR < 0.20 的阈值在亚裔中应验证，可能需下调至 0.18 |
| nose_bridge_height | 低鼻梁比例高，z 差值较小 | LOW_NOSE_BRIDGE 阈值 0.010 需用亚裔样本重新校准 |
| jaw_angle | 颌线普遍较柔和（angle 较大） | ROUND 的 jaw_angle > 128° 在亚裔中更容易触发，是合理收紧 |
| forehead_ratio | 额头相对扁平，forehead_ratio 偏低 | HEART 的 0.95 阈值可能仍偏高，建议用真实亚裔心形脸样本验证 |

# **Step 5 — Python 实现参考代码（关键计算）**

import numpy as np
import mediapipe as mp

# ── 关键点索引常量 ──────────────────────────────────────────
SILHOUETTE = [10,338,297,332,284,251,389,356,454,323,361,288,
              397,365,379,378,400,377,152,148,176,149,150,136,
              172,58,132,93,234,127,162,21,54,103,67,109]

FOREHEAD_TOP   = 10    # 额顶
CHIN_BOTTOM    = 152   # 下巴最低
CHEEK_R        = 454   # 右脸最宽
CHEEK_L        = 234   # 左脸最宽
JAW_R          = 365   # 右颌角
JAW_L          = 172   # 左颌角
CHIN_R         = 400   # 下巴右
CHIN_L         = 176   # 下巴左
BROW_OUTER_R   = 70    # 右眉外端
BROW_OUTER_L   = 300   # 左眉外端
BROW_PEAK_R    = 105   # 右眉峰（lid_visibility 分母）
BROW_PEAK_L    = 334   # 左眉峰
NOSE_ROOT      = 168   # 鼻根
NOSE_MID       = 6     # 鼻梁中点
NOSE_TIP       = 1     # 鼻尖
ALAR_R         = 358   # 右鼻翼
ALAR_L         = 129   # 左鼻翼
LIP_CORNER_R   = 291   # 右唇角
LIP_CORNER_L   = 61    # 左唇角
LIP_TOP_CTR    = 0     # 上唇中央（唇珠谷）
LIP_PEAK_R     = 37    # 上唇弓右峰
LIP_PEAK_L     = 267   # 上唇弓左峰
LIP_BOT_CTR    = 17    # 下唇最低点
EYE_R_OUTER    = 33;   EYE_R_INNER = 133
EYE_R_TOP1     = 159;  EYE_R_TOP2  = 158
EYE_R_BOT1     = 145;  EYE_R_BOT2  = 153
EYE_L_OUTER    = 263;  EYE_L_INNER = 362
EYE_L_TOP1     = 386;  EYE_L_TOP2  = 385
EYE_L_BOT1     = 374;  EYE_L_BOT2  = 380
IRIS_R         = 468   # 右虹膜中心
IRIS_L         = 473   # 左虹膜中心

# ── 核心指标计算 ─────────────────────────────────────────────
def dist(lm, i, j):
    return np.sqrt((lm[i].x - lm[j].x)**2 + (lm[i].y - lm[j].y)**2)

def compute_metrics(lm):
    """lm: mediapipe face_landmarks list（478点归一化坐标）"""
    xs = [lm[i].x for i in SILHOUETTE]
    ys = [lm[i].y for i in SILHOUETTE]

    face_height     = lm[CHIN_BOTTOM].y - lm[FOREHEAD_TOP].y
    cheekbone_width = max(xs) - min(xs)
    face_ratio      = face_height / max(cheekbone_width, 1e-6)

    forehead_width  = abs(lm[BROW_OUTER_R].x - lm[BROW_OUTER_L].x)
    forehead_ratio  = forehead_width / max(cheekbone_width, 1e-6)

    jaw_width       = abs(lm[JAW_R].x - lm[JAW_L].x)
    jaw_ratio       = cheekbone_width / max(jaw_width, 1e-6)

    chin_width_val  = abs(lm[CHIN_R].x - lm[CHIN_L].x)

    # jaw_angle（右侧，取左右平均）
    def angle_3pts(a, v, b):
        va = np.array([lm[a].x - lm[v].x, lm[a].y - lm[v].y])
        vb = np.array([lm[b].x - lm[v].x, lm[b].y - lm[v].y])
        cos_a = np.dot(va, vb) / (np.linalg.norm(va) * np.linalg.norm(vb) + 1e-9)
        return np.degrees(np.arccos(np.clip(cos_a, -1, 1)))
    jaw_angle = (angle_3pts(JAW_R, CHIN_BOTTOM, 397) +
                 angle_3pts(JAW_L, CHIN_BOTTOM, 136)) / 2

    # EAR（Soukupová & Čech 2016）
    EAR_R = (dist(lm,159,145) + dist(lm,158,153)) / (2 * dist(lm,33,133) + 1e-9)
    EAR_L = (dist(lm,386,374) + dist(lm,385,380)) / (2 * dist(lm,263,362) + 1e-9)
    EAR   = (EAR_R + EAR_L) / 2

    eye_height_R = max(lm[159].y, lm[158].y) - min(lm[145].y, lm[153].y)
    eye_height_L = max(lm[386].y, lm[385].y) - min(lm[374].y, lm[380].y)
    eye_width_R  = dist(lm, EYE_R_OUTER, EYE_R_INNER)
    eye_width_L  = dist(lm, EYE_L_OUTER, EYE_L_INNER)
    eye_ar = ((eye_width_R/max(eye_height_R,1e-6)) +
              (eye_width_L/max(eye_height_L,1e-6))) / 2

    # eye_tilt_angle
    def tilt(outer, inner):
        return np.degrees(np.arctan2(lm[outer].y - lm[inner].y,
                                     lm[outer].x - lm[inner].x))
    eye_tilt = (tilt(EYE_R_OUTER, EYE_R_INNER) +
                tilt(EYE_L_OUTER, EYE_L_INNER)) / 2

    eye_spacing = abs(lm[IRIS_L].x - lm[IRIS_R].x) / max(cheekbone_width, 1e-6)

    # lid_visibility（防除零）
    guard = face_height * 0.02
    lid_R = eye_height_R / max(lm[BROW_PEAK_R].y - lm[EYE_R_TOP1].y, guard)
    lid_L = eye_height_L / max(lm[BROW_PEAK_L].y - lm[EYE_L_TOP1].y, guard)
    lid_visibility = (lid_R + lid_L) / 2

    # 鼻梁高度（3D z 差值）
    nose_bridge_h = (lm[NOSE_ROOT].z - lm[NOSE_MID].z) / max(face_height, 1e-6)

    alar_ratio = dist(lm, ALAR_L, ALAR_R) / max(cheekbone_width, 1e-6)
    lip_width_r = dist(lm, LIP_CORNER_L, LIP_CORNER_R) / max(cheekbone_width, 1e-6)
    lip_height_raw = lm[LIP_BOT_CTR].y - lm[LIP_TOP_CTR].y
    lip_height_r = lip_height_raw / max(face_height, 1e-6)

    # cupid_bow（修正公式，正值=唇峰明显）
    peak_avg = (lm[LIP_PEAK_R].y + lm[LIP_PEAK_L].y) / 2
    cupid_bow = (peak_avg - lm[LIP_TOP_CTR].y) / max(lip_height_raw, 1e-6)

    return dict(
        face_height=face_height, cheekbone_width=cheekbone_width,
        face_ratio=face_ratio, forehead_ratio=forehead_ratio,
        jaw_ratio=jaw_ratio, jaw_angle=jaw_angle,
        chin_width_ratio=chin_width_val/max(cheekbone_width,1e-6),
        EAR=EAR, eye_ar=eye_ar, eye_tilt=eye_tilt,
        eye_spacing=eye_spacing, lid_visibility=lid_visibility,
        nose_bridge_h=nose_bridge_h, alar_ratio=alar_ratio,
        lip_width_r=lip_width_r, lip_height_r=lip_height_r,
        cupid_bow=cupid_bow
    )

# **Step 6 — 参考资料来源**

| 来源 | 用途 |
| --- | --- |
| TensorFlow.js face-landmarks-detection/keypoints.ts (Google, 2020) | Silhouette 36点、lips上下内外、eyebrow、eye upper/lower 索引的官方定义 |
| simplified_mediapipe_face_landmarks (k-m-irfan, GitHub) | Left/Right Eyebrow（10点）、Eye outline（16点）完整索引实测验证 |
| Soukupová & Čech, "Real-Time Eye Blink Detection using Facial Landmarks", 2016 | EAR（Eye Aspect Ratio）标准 6-point 公式，MediaPipe 版点位映射 |
| MediaPipe Face Mesh 官方文档 (Google AI Edge, 2024) | 478-pt 输出格式、坐标系说明（x/y 归一化，z 以脸宽缩放） |
| Pishi.ai FaceMesh landmark reference | pt1（鼻尖）、pt10（额顶）、pt152（下巴）、pt468/473（虹膜中心）等关键点确认 |
| Drowsiness-Detection-Mediapipe (Tandon-A, GitHub) | Right eye [33,160,159,133,153,145] / Left eye [263,387,386,362,380,374] 实战 EAR 索引参考 |
| "AI-Driven Makeup Suggestions Leveraging Mediapipe Face Landmarks For Eye Shape Detection", ResearchGate 2023 | MediaPipe 用于眼型（monolid/almond/round/upturned/downturned）分类的学术先例 |
| MediaPipe Google Groups: face mesh depth coordinate (Yisrael Harris, 2023) | z 坐标含义确认：以脸宽为单位缩放，越负越靠近相机 |

*BeautyFit Face Analysis Spec v2.0 — MediaPipe 478-pt*