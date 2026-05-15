import { auth } from './auth';

// * Create master user, if masterpassword is set, and running as self-hosted
if (process.env['FLUX_MASTER_PASSWORD']) {

    if (process.env['FLUX_MASTER_PASSWORD'].length < 8) {
        throw new Error('FLUX_MASTER_PASSWORD was set, must be a string with at least 8 characters.');
    }

    if (process.env['FLUX_MASTER_PASSWORD'].length > 128) {
        throw new Error('FLUX_MASTER_PASSWORD was set, must be a string with at most 128 characters.');
    }

    console.log('FLUX_MASTER_PASSWORD detected in env, attempting to create admin user with email admin@admin.com');
    (async () => {
        try {
            const data = await auth.api.signUpEmail({
                body: {
                    name: 'Administrator',
                    email: 'admin@admin.com',
                    password: process.env['FLUX_MASTER_PASSWORD']!,
                },
            });

            console.log('Admin user created:', data.user);
        } catch {
            console.warn('Admin user already exists, skipping creation.');
        }
    })();
} else {
    console.log('FLUX_MASTER_PASSWORD not set, skipping admin user creation.');
}
