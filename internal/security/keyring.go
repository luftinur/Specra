package security

import (
	"errors"
	"fmt"

	"github.com/zalando/go-keyring"
)

const AppServiceName = "AIRequirementsStudio"

type CredentialManager struct {
	serviceName string
}

func NewCredentialManager() *CredentialManager {
	return &CredentialManager{serviceName: AppServiceName}
}

func (cm *CredentialManager) StoreAPIKey(providerID, apiKey string) error {
	if apiKey == "" {
		err := keyring.Delete(cm.serviceName, providerID)
		if err != nil && !errors.Is(err, keyring.ErrNotFound) {
			return fmt.Errorf("failed to clear api key from keyring: %w", err)
		}
		return nil
	}

	if err := keyring.Set(cm.serviceName, providerID, apiKey); err != nil {
		return fmt.Errorf("failed to store api key securely: %w", err)
	}
	return nil
}

func (cm *CredentialManager) GetAPIKey(providerID string) (string, error) {
	key, err := keyring.Get(cm.serviceName, providerID)
	if err != nil {
		return "", fmt.Errorf("failed to retrieve key for provider %s: %w", providerID, err)
	}
	return key, nil
}

func (cm *CredentialManager) HasAPIKey(providerID string) bool {
	_, err := keyring.Get(cm.serviceName, providerID)
	return err == nil
}
