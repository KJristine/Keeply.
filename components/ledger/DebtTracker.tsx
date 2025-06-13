import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { decryptData } from './AddDebtModal';

const { width, height } = Dimensions.get("window");

interface Debt {
  id: string;
  personName: string;
  amount: number;
  description: string;
  type: "owed_to_me" | "i_owe";
  date: Date;
  status: "active" | "settled";
  settledDate?: Date;
}

interface DecryptedDebt extends Debt {
  decryptionError: boolean;
}

interface DebtTrackerProps {
  debts: Debt[];
  onAddDebt: () => void;
  onSettleDebt: (debtId: string) => void;
  showHistory?: boolean;
}

export const DebtTracker: React.FC<DebtTrackerProps> = ({
  debts,
  onAddDebt,
  onSettleDebt,
  showHistory = false,
}) => {
  const [decryptedDebts, setDecryptedDebts] = useState<DecryptedDebt[]>([]);
  const [isDecrypting, setIsDecrypting] = useState(false);

  // Function to check if data appears to be encrypted
  const isEncryptedFormat = (data: string): boolean => {
    if (!data || typeof data !== 'string') return false;
    
    // Check if it contains the IV:encrypted format
    const parts = data.split(':');
    if (parts.length !== 2) return false;
    
    // Check if IV part is 16 characters (as per your IV_LENGTH)
    const [iv, encrypted] = parts;
    return iv.length === 16 && encrypted.length > 0;
  };

  // Function to decrypt all debts
  const decryptDebts = async (debtsToDecrypt: Debt[]) => {
    setIsDecrypting(true);
    
    const decrypted = await Promise.all(
      debtsToDecrypt.map(async (debt) => {
        try {
          let decryptedPersonName = debt.personName;
          let decryptedDescription = debt.description;
          let hasDecryptionError = false;

          // Check and decrypt personName if encrypted
          if (isEncryptedFormat(debt.personName)) {
            try {
              decryptedPersonName = await decryptData(debt.personName);
            } catch (error) {
              console.warn(`Failed to decrypt personName for debt ${debt.id}:`, error);
              decryptedPersonName = '[Decryption Failed]';
              hasDecryptionError = true;
            }
          }

          // Check and decrypt description if encrypted
          if (isEncryptedFormat(debt.description)) {
            try {
              decryptedDescription = await decryptData(debt.description);
            } catch (error) {
              console.warn(`Failed to decrypt description for debt ${debt.id}:`, error);
              decryptedDescription = '[Decryption Failed]';
              hasDecryptionError = true;
            }
          }

          return {
            ...debt,
            personName: decryptedPersonName,
            description: decryptedDescription || '[No Description]',
            decryptionError: hasDecryptionError,
          };
        } catch (error) {
          console.warn(`Failed to decrypt debt ${debt.id}:`, error);
          
          return {
            ...debt,
            personName: isEncryptedFormat(debt.personName) ? '[Decryption Failed]' : debt.personName,
            description: isEncryptedFormat(debt.description) ? '[Decryption Failed]' : (debt.description || '[No Description]'),
            decryptionError: true,
          };
        }
      })
    );
    
    setDecryptedDebts(decrypted);
    setIsDecrypting(false);
  };

  // Decrypt debts when the debts prop changes
  useEffect(() => {
    if (debts.length > 0) {
      decryptDebts(debts);
    } else {
      setDecryptedDebts([]);
    }
  }, [debts]);

  // Filter debts based on showHistory prop - NO DUPLICATES
  const filteredDebts = showHistory
    ? decryptedDebts.filter((debt) => debt.status === "settled") // Only settled debts in history
    : decryptedDebts.filter((debt) => debt.status === "active"); // Only active debts in active view

  // Calculate totals for ONLY active debts (using decrypted data)
  const activeDebts = decryptedDebts.filter((debt) => debt.status === "active");
  const totalOwedToMe = activeDebts
    .filter((debt) => debt.type === "owed_to_me")
    .reduce((sum, debt) => sum + debt.amount, 0);

  const totalIOwe = activeDebts
    .filter((debt) => debt.type === "i_owe")
    .reduce((sum, debt) => sum + debt.amount, 0);

  const handleSettleDebtWithConfirmation = (debt: DecryptedDebt) => {
    Alert.alert(
      "Settle Debt",
      `Mark debt with ${debt.personName} as settled?\n\nThis will move it to your debt history.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Settle",
          style: "default",
          onPress: () => onSettleDebt(debt.id),
        },
      ]
    );
  };

  const renderDebtItem = (item: DecryptedDebt) => (
    <View key={item.id} style={styles.debtItem}>
      <View style={styles.debtLeft}>
        <View
          style={[
            styles.debtIcon,
            {
              backgroundColor:
                item.type === "owed_to_me"
                  ? item.status === "settled"
                    ? "#E8F5E8" // Light green for settled owed-to-me
                    : "#4CAF50" // Green for active owed-to-me
                  : item.status === "settled"
                  ? "#FFE8E8" // Light red for settled i-owe
                  : "#F44336", // Red for active i-owe
            },
          ]}
        >
          <Ionicons
            name={item.type === "owed_to_me" ? "arrow-down" : "arrow-up"}
            size={20}
            color={
              item.status === "settled"
                ? item.type === "owed_to_me"
                  ? "#4CAF50"
                  : "#F44336"
                : "#fff"
            }
          />
        </View>
        <View style={styles.debtDetails}>
          <View style={styles.debtHeader}>
            <Text 
              style={[
                styles.debtPersonName,
                item.decryptionError && { color: '#F44336', fontStyle: 'italic' }
              ]}
            >
              {item.personName}
            </Text>
            {item.status === "settled" && (
              <View style={styles.settledBadge}>
                <Text style={styles.settledBadgeText}>Settled</Text>
              </View>
            )}
          </View>
          <Text 
            style={[
              styles.debtDescription,
              item.decryptionError && { color: '#F44336', fontStyle: 'italic' }
            ]}
          >
            {item.description}
          </Text>
          <Text style={styles.debtDate}>
            {item.status === "settled"
              ? `Settled: ${(
                  item.settledDate || item.date
                ).toLocaleDateString()}`
              : `Added: ${item.date.toLocaleDateString()}`}
          </Text>
        </View>
      </View>
      <View style={styles.debtRight}>
        <Text
          style={[
            styles.debtAmount,
            {
              color:
                item.status === "settled"
                  ? "#999" // Gray for settled amounts
                  : item.type === "owed_to_me"
                  ? "#4CAF50"
                  : "#F44336",
            },
          ]}
        >
          {item.type === "owed_to_me" ? "+" : "-"}₱{item.amount.toFixed(2)}
        </Text>
        {/* Only show settle button for ACTIVE debts */}
        {item.status === "active" && (
          <TouchableOpacity
            style={styles.settleButton}
            onPress={() => handleSettleDebtWithConfirmation(item)}
          >
            <Text style={styles.settleButtonText}>Settle</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons
        name={showHistory ? "time-outline" : "people-outline"}
        size={48}
        color="#ccc"
      />
      <Text style={styles.emptyText}>
        {showHistory ? "No settled debts yet" : "No active debts"}
      </Text>
      <Text style={styles.emptySubtext}>
        {showHistory
          ? "Settled debts will appear here"
          : "Add your first debt record to get started"}
      </Text>
    </View>
  );

  // Show loading state while decrypting
  if (isDecrypting) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Summary Cards - Only show for ACTIVE debts view */}
      {!showHistory && (
        <View style={styles.summaryContainer}>
          <View style={[styles.summaryCard, styles.owedToMeCard]}>
            <Ionicons name="arrow-down-circle" size={24} color="#4CAF50" />
            <Text style={styles.summaryAmount}>
              ₱{totalOwedToMe.toFixed(2)}
            </Text>
            <Text style={styles.summaryLabel}>Owed to Me</Text>
          </View>

          <View style={[styles.summaryCard, styles.iOweCard]}>
            <Ionicons name="arrow-up-circle" size={24} color="#F44336" />
            <Text style={styles.summaryAmount}>₱{totalIOwe.toFixed(2)}</Text>
            <Text style={styles.summaryLabel}>I Owe</Text>
          </View>

          <View style={[styles.summaryCard, styles.netCard]}>
            <Ionicons
              name={
                totalOwedToMe - totalIOwe >= 0 ? "trending-up" : "trending-down"
              }
              size={24}
              color={totalOwedToMe - totalIOwe >= 0 ? "#4CAF50" : "#F44336"}
            />
            <Text
              style={[
                styles.summaryAmount,
                {
                  color: totalOwedToMe - totalIOwe >= 0 ? "#4CAF50" : "#F44336",
                },
              ]}
            >
              ₱{Math.abs(totalOwedToMe - totalIOwe).toFixed(2)}
            </Text>
            <Text style={styles.summaryLabel}>
              Net {totalOwedToMe - totalIOwe >= 0 ? "Owed" : "Owing"}
            </Text>
          </View>
        </View>
      )}

      {/* Add Debt Button - Only show for ACTIVE debts view */}
      {!showHistory && (
        <TouchableOpacity style={styles.addButton} onPress={onAddDebt}>
          <Ionicons name="add-circle" size={20} color="#F76A86" />
          <Text style={styles.addButtonText}>Add Debt Record</Text>
        </TouchableOpacity>
      )}

      {/* Debt List */}
      <View style={styles.debtList}>
        <Text style={styles.listTitle}>
          {showHistory
            ? `Debt History (${filteredDebts.length})`
            : `Active Debts (${filteredDebts.length})`}
        </Text>
        {filteredDebts.length === 0 ? (
          renderEmptyState()
        ) : (
          <View style={styles.debtsContainer}>
            {filteredDebts.map(renderDebtItem)}
          </View>
        )}
      </View>
    </View>
  );
};

export default DebtTracker;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  summaryContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  owedToMeCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
  },
  iOweCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#F44336",
  },
  netCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#2196F3",
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 11,
    color: "#666",
    marginTop: 4,
    textAlign: "center",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFE8EC",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  addButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: "#F76A86",
    fontWeight: "600",
  },
  debtList: {
    flex: 1,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 16,
  },
  debtsContainer: {
    flex: 1,
  },
  debtItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  debtLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  debtIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  debtDetails: {
    flex: 1,
  },
  debtHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  debtPersonName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  settledBadge: {
    backgroundColor: "#E8F5E8",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  settledBadgeText: {
    fontSize: 10,
    color: "#4CAF50",
    fontWeight: "600",
  },
  debtDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  debtDate: {
    fontSize: 12,
    color: "#999",
  },
  debtRight: {
    alignItems: "flex-end",
  },
  debtAmount: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  settleButton: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  settleButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    marginTop: 12,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#ccc",
    marginTop: 4,
    textAlign: "center",
  },
    loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  }
});
