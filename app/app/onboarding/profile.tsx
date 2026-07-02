import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, TouchableOpacity, Alert, Image, TextInput, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '../../src/theme';
import { Text } from '../../src/components/common/Text';
import { Button } from '../../src/components/common/Button';
import { Input } from '../../src/components/common/Input';
import { BottomSheet } from '../../src/components/common/BottomSheet';
import { Ionicons } from '@expo/vector-icons';
import { api, getToken } from '../../src/services/api';
import { NIGERIAN_BANKS } from '../../src/constants/banks';

const BankLogo = ({ uri, isPopular = false }: { uri: string; isPopular?: boolean }) => {
  const [imgLoading, setImgLoading] = useState(true);
  const size = isPopular ? 48 : 32;
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Image
        source={{ uri }}
        style={{ width: size, height: size, resizeMode: 'contain' }}
        onLoadStart={() => setImgLoading(true)}
        onLoadEnd={() => setImgLoading(false)}
      />
      {imgLoading && (
        <ActivityIndicator
          size="small"
          color={theme.colors.primary}
          style={StyleSheet.absoluteFillObject}
        />
      )}
    </View>
  );
};

export default function ProfileScreen() {
  const [bankAccount, setBankAccount] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [showBankSheet, setShowBankSheet] = useState(false);
  const [banks, setBanks] = useState<Array<{ code: string; name: string; logo?: string | null }>>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  // Validate auth session on mount (catches hot-reloads where storage falls back to memory)
  useEffect(() => {
    async function checkAuth() {
      const token = await getToken();
      if (!token) {
        Alert.alert('Session Expired', 'Please verify your phone number to continue.');
        router.replace('/onboarding/phone');
      }
    }
    checkAuth();
  }, []);

  // Load banks from backend
  useEffect(() => {
    async function loadBanks() {
      try {
        const list = await api.getBanks();
        if (Array.isArray(list)) {
          setBanks(list);
        } else {
          console.warn('[Profile] Banks endpoint did not return an array, falling back to offline list:', list);
          setBanks(NIGERIAN_BANKS);
        }
      } catch (e: any) {
        console.error('Failed to load banks from server, falling back to local list:', e.message);
        setBanks(NIGERIAN_BANKS);
      }
    }
    loadBanks();
  }, []);

  // Auto-detect 10 digits
  useEffect(() => {
    if (bankAccount.length === 10 && bankName && bankCode && !resolvedName) {
      handleResolve();
    }
  }, [bankAccount, bankName, bankCode]);

  const handleResolve = async () => {
    if (!bankCode) {
      Alert.alert('Invalid Bank', 'Please select a bank provider from the list.');
      return;
    }

    setLoading(true);
    try {
      const data = await api.completeProfile(bankAccount, bankCode);
      setLoading(false);
      if (data.user && data.user.name) {
        setResolvedName(data.user.name);
        setShowBottomSheet(true);
      } else {
        throw new Error('Name resolution failed. Please verify account number and bank.');
      }
    } catch (error: any) {
      setLoading(false);
      Alert.alert('Resolution Error', error.message || 'Failed to resolve account details. Please check your inputs.');
    }
  };

  const handleConfirm = () => {
    setShowBottomSheet(false);
    router.replace('/intro'); 
  };

  const handleReset = () => {
    setResolvedName(null);
    setShowBottomSheet(false);
    setBankAccount('');
  };

  // Filter popular banks (e.g. GTB, Zenith, Access, UBA, FirstBank, Wema, OPay, PalmPay, Kuda, Moniepoint)
  const popularBanks = banks.filter(bank => {
    const name = bank.name.toLowerCase();
    if (['058', '057', '044', '033', '011', '035'].includes(bank.code)) return true;
    if (name.includes('opay') || name.includes('palmpay') || name.includes('kuda') || name.includes('moniepoint')) return true;
    return false;
  });

  // Filter banks based on search query
  const filteredBanks = banks.filter(bank =>
    bank.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text variant="h2" weight="bold" color={theme.colors.secondary} style={styles.title}>
              Identity setup.
            </Text>
            <Text variant="body" color={theme.colors.text.secondary} style={styles.subtitle}>
              Enter your bank details to auto-resolve your identity and secure your payouts.
            </Text>
          </View>

          <View style={styles.form}>
            {/* Dropdown Select Trigger for Bank */}
            <TouchableOpacity 
              activeOpacity={0.7} 
              onPress={() => setShowBankSheet(true)}
              style={styles.selectTrigger}
            >
              <Text variant="caption" weight="semiBold" color={theme.colors.text.secondary} style={styles.triggerLabel}>
                Bank provider
              </Text>
              <View style={styles.triggerContent}>
                <Text 
                  variant="body" 
                  color={bankName ? theme.colors.text.primary : theme.colors.text.secondary}
                >
                  {bankName || 'Select bank (e.g. Wema Bank)'}
                </Text>
                <Ionicons name="chevron-down" size={18} color={theme.colors.text.secondary} />
              </View>
            </TouchableOpacity>
            
            <Input
              label="Account number"
              placeholder="10-digit account number"
              keyboardType="number-pad"
              maxLength={10}
              value={bankAccount}
              onChangeText={(val) => {
                setBankAccount(val);
                if (val.length < 10) setResolvedName(null);
              }}
            />

            {loading && !showBottomSheet && (
              <View style={styles.loadingState}>
                <ActivityIndicator color={theme.colors.accent} />
                <Text variant="caption" color={theme.colors.accent} style={styles.loadingText}>
                  Resolving name via Nomba...
                </Text>
              </View>
            )}

            {resolvedName && !showBottomSheet && (
              <TouchableOpacity onPress={() => setShowBottomSheet(true)} style={styles.resolvedDisplay}>
                <Text variant="caption" weight="bold" color={theme.colors.text.secondary}>RESOLVED NAME</Text>
                <Text variant="body" weight="bold" color={theme.colors.secondary}>{resolvedName}</Text>
              </TouchableOpacity>
            )}

            <View style={styles.infoBox}>
              <Ionicons name="bulb-outline" size={16} color={theme.colors.text.secondary} style={{ marginBottom: 4 }} />
              <Text variant="caption" color={theme.colors.text.secondary} style={styles.infoText}>
                Qova uses Nomba to verify account details. This ensures your funds are always sent to the right person.
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            <Button
              title="Verify account"
              onPress={handleResolve}
              loading={loading}
              disabled={bankAccount.length < 10 || !bankName || loading}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Confirm Identity BottomSheet */}
      <BottomSheet
        isVisible={showBottomSheet}
        onClose={() => setShowBottomSheet(false)}
        title="Confirm Identity"
      >
        <View style={styles.bottomSheetContent}>
          <View style={styles.nameCard}>
            <Text variant="caption" weight="bold" color={theme.colors.text.secondary} style={styles.cardLabel}>
              ACCOUNT NAME
            </Text>
            <Text variant="h2" weight="bold" color={theme.colors.primary} style={styles.resolvedName}>
              {resolvedName?.toUpperCase()}
            </Text>
            <View style={styles.divider} />
            <Text variant="caption" color={theme.colors.text.secondary}>
              {bankName} • {bankAccount}
            </Text>
          </View>

          <Text variant="body" color={theme.colors.text.secondary} align="center" style={styles.confirmationText}>
            Is this your correct legal name? We use this to verify all your future payouts.
          </Text>

          <Button
            title="Yes, this is me"
            onPress={handleConfirm}
            loading={loading}
            style={styles.confirmButton}
          />
          
          <TouchableOpacity onPress={handleReset} style={styles.notMeButton}>
            <Text variant="body" weight="semiBold" color={theme.colors.danger}>
              No, that's not me
            </Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      {/* Bank Picker BottomSheet */}
      <BottomSheet
        isVisible={showBankSheet}
        onClose={() => {
          setShowBankSheet(false);
          setSearchQuery(''); // reset search query on close
        }}
        title="Select Bank"
      >
        {banks.length === 0 ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: theme.spacing.lg }} />
        ) : (
          <View style={{ width: '100%' }}>
            <FlatList
              data={filteredBanks}
              keyExtractor={(item) => item.code}
              style={styles.bankListScroll}
              contentContainerStyle={{ paddingBottom: 60 }}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={() => (
                <View style={{ width: '100%' }}>
                  {/* Search Input */}
                  <View style={styles.searchContainer}>
                    <Ionicons name="search" size={16} color={theme.colors.text.secondary} style={styles.searchIcon} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search bank name..."
                      placeholderTextColor={theme.colors.text.secondary}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      autoCorrect={false}
                      autoCapitalize="none"
                    />
                    {searchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={16} color={theme.colors.text.secondary} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Popular Banks (Only shown when not searching) */}
                  {searchQuery.length === 0 && popularBanks.length > 0 && (
                    <View style={styles.popularSection}>
                      <Text variant="caption" weight="bold" color={theme.colors.text.secondary} style={styles.sectionTitle}>
                        POPULAR BANKS
                      </Text>
                      <View style={styles.popularGrid}>
                        {popularBanks.map((bank) => (
                          <TouchableOpacity
                            key={`popular-${bank.code}`}
                            style={styles.popularGridCard}
                            onPress={() => {
                              setBankName(bank.name);
                              setBankCode(bank.code);
                              setResolvedName(null);
                              setShowBankSheet(false);
                            }}
                          >
                            <View style={styles.popularLogoContainer}>
                              {bank.logo ? (
                                <BankLogo uri={bank.logo} isPopular />
                              ) : (
                                <Text variant="body" weight="bold" color={theme.colors.primary}>
                                  {bank.name.substring(0, 2).toUpperCase()}
                                </Text>
                              )}
                            </View>
                            <Text variant="tiny" weight="semiBold" color={theme.colors.secondary} numberOfLines={1} style={styles.popularName}>
                              {bank.name.split(' ')[0]}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* All / Filtered Banks Header */}
                  <Text variant="caption" weight="bold" color={theme.colors.text.secondary} style={styles.sectionTitle}>
                    {searchQuery.length > 0 ? 'SEARCH RESULTS' : 'ALL BANKS'}
                  </Text>
                </View>
              )}
              renderItem={({ item: bank }) => (
                <TouchableOpacity
                  style={styles.bankItem}
                  onPress={() => {
                    setBankName(bank.name);
                    setBankCode(bank.code);
                    setResolvedName(null); // Reset if bank changes
                    setShowBankSheet(false);
                    setSearchQuery(''); // reset search
                  }}
                >
                  <View style={styles.bankItemLeft}>
                    <View style={styles.bankLogoContainer}>
                      {bank.logo ? (
                        <BankLogo uri={bank.logo} />
                      ) : (
                        <Text variant="caption" weight="bold" color={theme.colors.text.secondary}>
                          {bank.name.substring(0, 2).toUpperCase()}
                        </Text>
                      )}
                    </View>
                    <Text variant="body" weight="medium" color={theme.colors.secondary} style={styles.bankItemText}>
                      {bank.name}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.colors.text.secondary} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={() => (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text variant="body" color={theme.colors.text.secondary}>
                    No banks found matching "{searchQuery}"
                  </Text>
                </View>
              )}
            />
          </View>
        )}
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: theme.spacing.xl,
  },
  header: {
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  title: {
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    lineHeight: 22,
  },
  form: {
    flex: 1,
  },
  selectTrigger: {
    marginBottom: theme.spacing.md,
    width: '100%',
  },
  triggerLabel: {
    marginBottom: theme.spacing.xs,
    letterSpacing: 0.5,
  },
  triggerContent: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderRadius: theme.borderRadius.md,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bankListScroll: {
    maxHeight: 530, // Increased height further as requested
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    borderWidth: 1.5,
    borderColor: '#E5DFD3',
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    height: 44,
    marginBottom: theme.spacing.md,
    width: '100%',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fonts.body,
    paddingVertical: 0,
  },
  popularSection: {
    marginBottom: theme.spacing.md,
    width: '100%',
  },
  sectionTitle: {
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: theme.spacing.sm,
  },
  popularGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    marginVertical: 4,
  },
  popularGridCard: {
    alignItems: 'center',
    width: '23%', // 4 items per row
    marginHorizontal: '1%',
    marginBottom: theme.spacing.sm,
  },
  popularLogoContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5DFD3',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
    overflow: 'hidden',
  },
  popularLogo: {
    width: 48,
    height: 48,
    resizeMode: 'contain',
  },
  popularName: {
    fontSize: 10,
    textAlign: 'center',
    width: '100%',
  },
  bankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
    width: '100%',
  },
  bankItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bankLogoContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5DFD3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  bankLogo: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  bankItemText: {
    flex: 1,
  },
  loadingState: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  loadingText: {
    marginLeft: theme.spacing.sm,
  },
  resolvedDisplay: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    marginBottom: theme.spacing.lg,
  },
  infoBox: {
    marginTop: theme.spacing.sm,
  },
  infoText: {
    lineHeight: 18,
  },
  footer: {
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  bottomSheetContent: {
    alignItems: 'center',
  },
  nameCard: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
  },
  cardLabel: {
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  resolvedName: {
    marginBottom: theme.spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.sm,
  },
  confirmationText: {
    marginBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.md,
  },
  confirmButton: {
    width: '100%',
    marginBottom: theme.spacing.md,
  },
  notMeButton: {
    padding: theme.spacing.md,
  },
});
