import { useState } from 'react';
import styles from './admin.module.css';

export default function PasswordInput({
    id,
    value,
    onChange,
    autoComplete = 'new-password',
    placeholder = 'Mínimo 8 caracteres',
    invalid = false,
    disabled = false,
}) {
    const [visible, setVisible] = useState(false);

    return (
        <div className={styles.passwordField}>
            <input
                id={id}
                type={visible ? 'text' : 'password'}
                className={`${styles.input} ${styles.passwordInput}`}
                value={value}
                autoComplete={autoComplete}
                aria-invalid={invalid}
                onChange={onChange}
                placeholder={placeholder}
                disabled={disabled}
            />
            <button
                id={id ? `${id}-toggle` : undefined}
                type="button"
                className={styles.passwordToggle}
                onClick={() => setVisible((current) => !current)}
                aria-pressed={visible}
                aria-controls={id}
                disabled={disabled}
            >
                {visible ? 'Ocultar' : 'Mostrar'}
            </button>
        </div>
    );
}
