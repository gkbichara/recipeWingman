import React, { useState, useRef } from 'react';
import { uploadRecipe } from '../api';
import styles from './RecipeViewer.module.css';

/**
 * RecipeViewer
 * Right-side panel for listing recipes, uploading new ones,
 * and displaying the active recipe's ingredients/steps.
 *
 * Props:
 *   recipes: [{ id, name, source }]
 *   activeRecipe: recipe object | null
 *   onSelectRecipe(recipe): called when user selects a recipe
 *   onRecipeUploaded(recipe): called when a new recipe is added
 */
export default function RecipeViewer({ recipes, activeRecipe, onSelectRecipe, onRecipeUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [tab, setTab] = useState('list'); // 'list' | 'active'
  const fileInputRef = useRef(null);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const recipe = await uploadRecipe(file);
      onRecipeUploaded(recipe);
      setTab('list');
    } catch {
      setUploadError('Upload failed. Only PDF and text files are supported.');
    } finally {
      setUploading(false);
      e.target.value = ''; // reset input
    }
  };

  return (
    <div className={styles.panel}>
      {/* Panel header */}
      <div className={styles.header}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === 'list' ? styles.tabActive : ''}`}
            onClick={() => setTab('list')}
          >
            Recipes
          </button>
          {activeRecipe && (
            <button
              className={`${styles.tab} ${tab === 'active' ? styles.tabActive : ''}`}
              onClick={() => setTab('active')}
            >
              {activeRecipe.name?.slice(0, 18) ?? 'Active'}
            </button>
          )}
        </div>

        <button
          className={styles.uploadBtn}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          title="Upload a recipe PDF or text file"
          aria-label="Upload recipe"
        >
          {uploading ? '…' : '+'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.md"
          className={styles.hiddenInput}
          onChange={handleUpload}
        />
      </div>

      {uploadError && (
        <div className={styles.uploadError}>{uploadError}</div>
      )}

      {/* Content */}
      <div className={styles.body}>
        {tab === 'list' ? (
          <RecipeList
            recipes={recipes}
            activeId={activeRecipe?.id}
            onSelect={(r) => { onSelectRecipe(r); setTab('active'); }}
          />
        ) : (
          activeRecipe && <ActiveRecipeView recipe={activeRecipe} />
        )}
      </div>
    </div>
  );
}

// ── Recipe list ─────────────────────────────────────────────
function RecipeList({ recipes, activeId, onSelect }) {
  if (recipes.length === 0) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>📄</span>
        <p>No recipes yet. Upload a PDF or text file to get started.</p>
      </div>
    );
  }

  return (
    <ul className={styles.list}>
      {recipes.map((r) => (
        <li key={r.id}>
          <button
            className={`${styles.recipeItem} ${r.id === activeId ? styles.recipeItemActive : ''}`}
            onClick={() => onSelect(r)}
          >
            <span className={styles.recipeIcon}>🍽</span>
            <div className={styles.recipeMeta}>
              <span className={styles.recipeName}>{r.name}</span>
              {r.source && (
                <span className={styles.recipeSource}>{r.source}</span>
              )}
            </div>
            {r.id === activeId && (
              <span className={styles.activeDot} aria-label="Active" />
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}

// ── Active recipe detail ────────────────────────────────────
function ActiveRecipeView({ recipe }) {
  const [currentStep, setCurrentStep] = useState(0);
  const steps = recipe.steps ?? [];
  const ingredients = recipe.ingredients ?? [];

  return (
    <div className={styles.activeView}>
      <h2 className={styles.activeTitle}>{recipe.name}</h2>

      {ingredients.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Ingredients</h3>
          <ul className={styles.ingredientList}>
            {ingredients.map((ing, i) => (
              <li key={i} className={styles.ingredient}>{ing}</li>
            ))}
          </ul>
        </section>
      )}

      {steps.length > 0 && (
        <section className={styles.section}>
          <div className={styles.stepsHeader}>
            <h3 className={styles.sectionTitle}>Steps</h3>
            <span className={styles.stepCount}>
              {currentStep + 1} / {steps.length}
            </span>
          </div>

          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>Step {currentStep + 1}</div>
            <p className={styles.stepText}>{steps[currentStep]}</p>
          </div>

          <div className={styles.stepNav}>
            <button
              className={styles.navBtn}
              onClick={() => setCurrentStep(s => Math.max(0, s - 1))}
              disabled={currentStep === 0}
            >
              ← Prev
            </button>
            <button
              className={styles.navBtn}
              onClick={() => setCurrentStep(s => Math.min(steps.length - 1, s + 1))}
              disabled={currentStep === steps.length - 1}
            >
              Next →
            </button>
          </div>
        </section>
      )}

      {steps.length === 0 && ingredients.length === 0 && (
        <div className={styles.empty}>
          <p>Recipe content will appear here once loaded from the backend.</p>
        </div>
      )}
    </div>
  );
}
