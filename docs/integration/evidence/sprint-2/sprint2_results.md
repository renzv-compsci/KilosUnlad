| Exp | Holdout macro F1 | Per-class F1 (L1/L2/L3) | ROC-AUC OvR | Val macro F1 | Training rows | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| E1 (winner) | 0.6244 | 0.382 / 0.572 / 0.919 | 0.9021 | 0.6207 | {'empirical': 29080} | empirical, defaults |
| E2 | 0.6055 | 0.427 / 0.505 / 0.884 | 0.8872 | 0.6093 | {'empirical': 29080} | empirical, balanced |
| E3 | 0.6123 | 0.444 / 0.508 / 0.885 | 0.8936 | 0.6125 | {'empirical': 29080} | empirical, balanced, tuned (CV on train folds) {'colsample_bytree': 0.5669260594003166, 'learning_rate': 0.010418078759816981, 'max_depth': 9, 'min_child_samples': 10, 'min_split_gain': 0.345857198584456, 'n_estimators': 858, 'num_leaves': 102, 'reg_alpha': 0.9991783100123222, 'reg_lambda': 4.494309834137459, 'subsample': 0.792574766162736} |
| E4a | 0.6104 | 0.443 / 0.467 / 0.920 | 0.8936 | 0.6181 | {'empirical': 29080, 'synthetic': 69999} | blend, synthetic weight 0.3 |
| E4b | 0.6062 | 0.441 / 0.459 / 0.919 | 0.8908 | 0.6166 | {'empirical': 29080, 'synthetic': 69999} | blend, synthetic weight 0.5 |
| E5 | 0.5991 | 0.425 / 0.492 / 0.880 | 0.8851 | 0.6072 | {'empirical': 29080, 'synthetic_pretrain': 69999} | pretrain synthetic, fine-tune empirical |
