-- Create budgets table that is compatible with the CreateBudget.tsx component
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    category_id UUID REFERENCES public.expense_categories(id) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    spent DECIMAL(12, 2) DEFAULT 0 NOT NULL,
    period TEXT NOT NULL CHECK (period IN ('month', 'quarter', 'year')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Apply RLS to the budgets table
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- Create policies for budgets
CREATE POLICY "Users can view their own budgets" 
    ON public.budgets FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own budgets" 
    ON public.budgets FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budgets" 
    ON public.budgets FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budgets" 
    ON public.budgets FOR DELETE 
    USING (auth.uid() = user_id);

-- Create budget_details view for more convenient queries
CREATE OR REPLACE VIEW public.budget_details AS
SELECT 
    b.id,
    b.user_id,
    b.category_id,
    ec.category_name,
    b.amount,
    b.spent,
    (b.amount - b.spent) AS remaining,
    CASE
        WHEN b.amount > 0 THEN ROUND((b.spent / b.amount) * 100, 2)
        ELSE 0
    END AS percentage,
    CASE
        WHEN b.spent >= b.amount THEN 'danger'
        WHEN b.spent >= (b.amount * 0.75) THEN 'warning'
        ELSE 'success'
    END AS status,
    TO_CHAR(b.start_date, 'Month') AS month,
    EXTRACT(YEAR FROM b.start_date) AS year,
    b.period,
    b.start_date,
    b.end_date,
    b.created_at
FROM 
    public.budgets b
JOIN 
    public.expense_categories ec ON b.category_id = ec.id;

-- Grant appropriate permissions on the view
GRANT SELECT ON public.budget_details TO authenticated;

-- Create index on common query fields
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON public.budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_category_id ON public.budgets(category_id);
CREATE INDEX IF NOT EXISTS idx_budgets_period ON public.budgets(period);
CREATE INDEX IF NOT EXISTS idx_budgets_start_date ON public.budgets(start_date);

-- Create a function to update budget spent amount
CREATE OR REPLACE FUNCTION update_budget_spent()
RETURNS TRIGGER AS $$
DECLARE
    v_category_id UUID;
    v_transaction_date DATE;
    v_amount DECIMAL;
    v_budget_id UUID;
BEGIN
    -- For expense transactions, update budget spent
    IF TG_OP = 'INSERT' AND NEW.type = 'expense' THEN
        v_category_id := NEW.category_id;
        v_transaction_date := NEW.date;
        v_amount := NEW.amount;
        
        -- Find the budget that matches this transaction's category and date
        SELECT id INTO v_budget_id
        FROM public.budgets
        WHERE category_id = v_category_id
        AND user_id = NEW.user_id
        AND v_transaction_date BETWEEN start_date AND end_date
        LIMIT 1;
        
        -- If a matching budget is found, update its spent amount
        IF v_budget_id IS NOT NULL THEN
            UPDATE public.budgets
            SET spent = spent + v_amount
            WHERE id = v_budget_id;
        END IF;
    
    -- For expense transactions that are updated, adjust budget spent
    ELSIF TG_OP = 'UPDATE' AND NEW.type = 'expense' THEN
        -- If the category or date changed, we need to handle both old and new budgets
        IF NEW.category_id != OLD.category_id OR NEW.date != OLD.date THEN
            -- Remove amount from old budget if it exists
            SELECT id INTO v_budget_id
            FROM public.budgets
            WHERE category_id = OLD.category_id
            AND user_id = OLD.user_id
            AND OLD.date BETWEEN start_date AND end_date
            LIMIT 1;
            
            IF v_budget_id IS NOT NULL THEN
                UPDATE public.budgets
                SET spent = spent - OLD.amount
                WHERE id = v_budget_id;
            END IF;
            
            -- Add amount to new budget if it exists
            SELECT id INTO v_budget_id
            FROM public.budgets
            WHERE category_id = NEW.category_id
            AND user_id = NEW.user_id
            AND NEW.date BETWEEN start_date AND end_date
            LIMIT 1;
            
            IF v_budget_id IS NOT NULL THEN
                UPDATE public.budgets
                SET spent = spent + NEW.amount
                WHERE id = v_budget_id;
            END IF;
        -- If only the amount changed
        ELSIF NEW.amount != OLD.amount THEN
            SELECT id INTO v_budget_id
            FROM public.budgets
            WHERE category_id = NEW.category_id
            AND user_id = NEW.user_id
            AND NEW.date BETWEEN start_date AND end_date
            LIMIT 1;
            
            IF v_budget_id IS NOT NULL THEN
                UPDATE public.budgets
                SET spent = spent - OLD.amount + NEW.amount
                WHERE id = v_budget_id;
            END IF;
        END IF;
    
    -- For deleted expense transactions, reduce budget spent
    ELSIF TG_OP = 'DELETE' AND OLD.type = 'expense' THEN
        v_category_id := OLD.category_id;
        v_transaction_date := OLD.date;
        v_amount := OLD.amount;
        
        -- Find the budget that matches this transaction's category and date
        SELECT id INTO v_budget_id
        FROM public.budgets
        WHERE category_id = v_category_id
        AND user_id = OLD.user_id
        AND v_transaction_date BETWEEN start_date AND end_date
        LIMIT 1;
        
        -- If a matching budget is found, update its spent amount
        IF v_budget_id IS NOT NULL THEN
            UPDATE public.budgets
            SET spent = GREATEST(0, spent - v_amount)  -- Ensure spent doesn't go negative
            WHERE id = v_budget_id;
        END IF;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers to update budget spent when transactions change
CREATE TRIGGER update_budget_spent_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_budget_spent();

-- Populate initial budget data for demo purposes
DO $$
DECLARE
    v_user_id UUID := '952a101d-d64d-42a8-89ce-cb4061aaaf5e'; -- Use the same admin user ID from populate-transaction-data.sql
    v_housing_category_id UUID;
    v_groceries_category_id UUID;
    v_entertainment_category_id UUID;
    v_current_date DATE := CURRENT_DATE;
    v_month_start DATE := DATE_TRUNC('month', v_current_date);
    v_month_end DATE := (DATE_TRUNC('month', v_current_date) + INTERVAL '1 month - 1 day')::DATE;
    v_quarter_start DATE := DATE_TRUNC('quarter', v_current_date);
    v_quarter_end DATE := (DATE_TRUNC('quarter', v_current_date) + INTERVAL '3 months - 1 day')::DATE;
    v_year_start DATE := DATE_TRUNC('year', v_current_date);
    v_year_end DATE := (DATE_TRUNC('year', v_current_date) + INTERVAL '1 year - 1 day')::DATE;
BEGIN
    -- Get category IDs for demo budgets
    SELECT id INTO v_housing_category_id FROM public.expense_categories 
    WHERE user_id = v_user_id AND category_name = 'Housing' LIMIT 1;
    
    SELECT id INTO v_groceries_category_id FROM public.expense_categories 
    WHERE user_id = v_user_id AND category_name = 'Groceries' LIMIT 1;
    
    SELECT id INTO v_entertainment_category_id FROM public.expense_categories 
    WHERE user_id = v_user_id AND category_name = 'Entertainment' LIMIT 1;
    
    -- Insert demo budgets if we found the categories
    IF v_housing_category_id IS NOT NULL THEN
        INSERT INTO public.budgets (
            id, user_id, category_id, amount, spent, period, start_date, end_date, created_at
        ) VALUES (
            uuid_generate_v4(), v_user_id, v_housing_category_id, 
            1500.00, 750.00, 'month', v_month_start, v_month_end, NOW()
        );
    END IF;
    
    IF v_groceries_category_id IS NOT NULL THEN
        INSERT INTO public.budgets (
            id, user_id, category_id, amount, spent, period, start_date, end_date, created_at
        ) VALUES (
            uuid_generate_v4(), v_user_id, v_groceries_category_id, 
            600.00, 350.00, 'month', v_month_start, v_month_end, NOW()
        );
    END IF;
    
    IF v_entertainment_category_id IS NOT NULL THEN
        INSERT INTO public.budgets (
            id, user_id, category_id, amount, spent, period, start_date, end_date, created_at
        ) VALUES (
            uuid_generate_v4(), v_user_id, v_entertainment_category_id, 
            250.00, 180.00, 'month', v_month_start, v_month_end, NOW()
        ),
        (
            uuid_generate_v4(), v_user_id, v_entertainment_category_id, 
            700.00, 280.00, 'quarter', v_quarter_start, v_quarter_end, NOW() - INTERVAL '1 day'
        ),
        (
            uuid_generate_v4(), v_user_id, v_entertainment_category_id, 
            3000.00, 1200.00, 'year', v_year_start, v_year_end, NOW() - INTERVAL '2 days'
        );
    END IF;
END $$; 